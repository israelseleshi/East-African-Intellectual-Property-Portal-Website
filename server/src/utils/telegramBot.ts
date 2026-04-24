import { Telegraf, Markup } from 'telegraf';
import { pool } from '../database/db.js';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');

const userSessions = new Map<number, { page: number; data?: any }>();

interface TelegramUser {
  id: number;
  isAuthorized: boolean;
  isAdmin: boolean;
  accessToken?: string;
}

const telegramUsers = new Map<number, TelegramUser>();

export function isAdmin(chatId: number): boolean {
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  return chatId.toString() === adminChatId?.toString();
}

export function authorizeUser(chatId: number): void {
  const user = telegramUsers.get(chatId);
  if (user) {
    user.isAuthorized = true;
    user.isAdmin = isAdmin(chatId);
    telegramUsers.set(chatId, user);
  }
}

function buildClientDetailKeyboard(clientId: string, page: number, totalPages: number) {
  const buttons = [];
  
  // Navigation row
  const navRow = [];
  if (page > 1) {
    navRow.push(Markup.button.callback('◀ Prev', `cp_${page}_${clientId}`));
  }
  navRow.push(Markup.button.callback(`${page}/${totalPages}`, 'noop'));
  if (page < totalPages) {
    navRow.push(Markup.button.callback('Next ▶', `cn_${page}_${clientId}`));
  }
  buttons.push(navRow);
  
  // Action row
  buttons.push([
    Markup.button.callback('✏️ Edit', `edit_start_${clientId}`),
    Markup.button.callback('🗑️ Delete', `delete_confirm_${clientId}`)
  ]);
  
  // Back to menu
  buttons.push([Markup.button.callback('🔙 Back to Menu', 'main_menu')]);

  return Markup.inlineKeyboard(buttons);
}

function buildMainMenuKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📊 Dashboard', 'menu_stats'), Markup.button.callback('👥 Clients', 'menu_clients')],
    [Markup.button.callback('📁 Cases', 'menu_cases'), Markup.button.callback('⏰ Deadlines', 'menu_deadlines')],
    [Markup.button.callback('💰 Invoicing', 'menu_invoices'), Markup.button.callback('🗑️ Trash', 'menu_trash')],
    [Markup.button.callback('➕ Add Client', 'add_client')]
  ]);
}

export function setupBot() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    console.log('[Telegram Bot] No bot token configured, skipping bot setup');
    return null;
  }

  console.log('[Telegram Bot] Setting up bot...');

  bot.command('start', async (ctx) => {
    console.log('[Telegram Bot] Received /start command from:', ctx.from.id);
    const chatId = ctx.from.id;
    const isSuperAdmin = isAdmin(chatId);
    
    if (isSuperAdmin) {
      telegramUsers.set(chatId, { id: chatId, isAuthorized: true, isAdmin: true });
      userSessions.set(chatId, { page: 1 });
      await ctx.reply(
        '👋 Welcome to EAIP TPMS Bot!\n\n' +
        'You are logged in as Super Admin.\n\n' +
        'Choose an option:',
        buildMainMenuKeyboard()
      );
    } else {
      telegramUsers.set(chatId, { id: chatId, isAuthorized: false, isAdmin: false });
      await ctx.reply(
        '👋 Welcome to EAIP TPMS Bot!\n\n' +
        'You need authorization to use this bot.\n' +
        'Contact the superadmin to get access.'
      );
    }
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(
      '📚 EAIP TPMS Bot Commands:\n\n' +
      '/start - Get started\n' +
      '/dashboard - Dashboard statistics\n' +
      '/clients - View clients with actions\n' +
      '/cases - View trademark cases\n' +
      '/deadlines - View upcoming deadlines\n' +
      '/invoices - View invoices\n' +
      '/trash - View trash\n' +
      '/help - Show this help'
    );
  });

  bot.command('dashboard', async (ctx) => {
    await sendStats(ctx);
  });

  bot.command('stats', async (ctx) => {
    await sendStats(ctx);
  });

  bot.command('invoices', async (ctx) => {
    await sendInvoices(ctx);
  });

  bot.command('trash', async (ctx) => {
    await sendTrash(ctx);
  });

  bot.command('clients', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      await ctx.reply('❌ Unauthorized. Admin access only.');
      return;
    }

    userSessions.set(ctx.from.id, { page: 1 });
    await showClientDetail(ctx, 1);
  });

  async function showClientDetail(ctx: any, page: number) {
    try {
      const offset = page - 1;
      
      const { query } = await import('../database/db.js');
      
      const countResult = await query('SELECT COUNT(*) as count FROM clients WHERE deleted_at IS NULL') as any;
      const total = countResult?.rows?.[0]?.count || 0;
      const totalPages = total; // 1 client per page

      const result = await query(
        `SELECT id, name, type, email, telephone, nationality, city, address_street, created_at 
         FROM clients WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 1 OFFSET ${offset}`
      ) as any;
      const client = result?.rows?.[0];

      if (!client) {
        await ctx.reply('No clients found.', Markup.inlineKeyboard([[Markup.button.callback('🔙 Back to Menu', 'main_menu')]]));
        return;
      }

      const message = `👤 Client (${page}/${totalPages})

━━━━━━━━━━━━━━━━━━━━━
📛 Name: ${client.name}
🏢 Type: ${client.type || 'INDIVIDUAL'}
📧 Email: ${client.email || 'N/A'}
📞 Phone: ${client.telephone || 'N/A'}
🌍 Nationality: ${client.nationality || 'N/A'}
🏙️ City: ${client.city || 'N/A'}
📍 Address: ${client.address_street || 'N/A'}
📅 Created: ${client.created_at ? new Date(client.created_at).toLocaleDateString() : 'N/A'}
━━━━━━━━━━━━━━━━━━━━━`;

      await ctx.reply(message, buildClientDetailKeyboard(client.id, page, totalPages));
    } catch (error: any) {
      console.error('[Telegram Bot] Client detail error:', error);
      await ctx.reply('❌ Error: ' + (error?.message || 'Unknown error'), Markup.inlineKeyboard([[Markup.button.callback('🔙 Back to Menu', 'main_menu')]]));
    }
  }

  // Callback query handlers
  bot.action('main_menu', async (ctx) => {
    ctx.answerCbQuery();
    await ctx.editMessageText(
      '👋 Welcome to EAIP TPMS Bot!\n\nChoose an option:',
      buildMainMenuKeyboard()
    );
  });

  bot.action('menu_stats', async (ctx) => {
    ctx.answerCbQuery();
    await ctx.deleteMessage();
    await sendStats(ctx);
  });

  bot.action('menu_clients', async (ctx) => {
    ctx.answerCbQuery();
    await ctx.deleteMessage();
    userSessions.set(ctx.from.id, { page: 1 });
    await showClientDetail(ctx, 1);
  });

  bot.action('menu_cases', async (ctx) => {
    ctx.answerCbQuery();
    await ctx.deleteMessage();
    await sendCases(ctx);
  });

  bot.action('menu_deadlines', async (ctx) => {
    ctx.answerCbQuery();
    await ctx.deleteMessage();
    await sendDeadlines(ctx);
  });

  bot.action('menu_invoices', async (ctx) => {
    ctx.answerCbQuery();
    await ctx.deleteMessage();
    await sendInvoices(ctx);
  });

  bot.action('menu_trash', async (ctx) => {
    ctx.answerCbQuery();
    await ctx.deleteMessage();
    await sendTrash(ctx);
  });

  bot.action('add_client', async (ctx) => {
    ctx.answerCbQuery();
    await ctx.editMessageText(
      '➕ Add New Client\n\n' +
      'Please enter client name:',
      Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel', 'main_menu')]])
    );
    userSessions.set(ctx.from.id, { page: 0, data: { step: 'name' } });
  });

  // Client navigation
  bot.action('noop', async (ctx) => {
    ctx.answerCbQuery();
  });

  bot.action(/cp_(\d+)_/, async (ctx) => {
    ctx.answerCbQuery();
    const currentPage = parseInt(ctx.match[1]);
    if (currentPage > 1) {
      await ctx.deleteMessage();
      await showClientDetail(ctx, currentPage - 1);
    }
  });

  bot.action(/cn_(\d+)_/, async (ctx) => {
    ctx.answerCbQuery();
    const currentPage = parseInt(ctx.match[1]);
    await ctx.deleteMessage();
    // Will show next client - if no client exists, it will show empty
    await showClientDetail(ctx, currentPage + 1);
  });

  bot.action(/view_single_(.+)/, async (ctx) => {
    ctx.answerCbQuery();
    const clientId = ctx.match[1];
    
    try {
      const { query } = await import('../database/db.js');
      
      // Get current page by finding position
      const allClients = await query(
        'SELECT id FROM clients WHERE deleted_at IS NULL ORDER BY created_at DESC'
      ) as any;
      const clientIds = allClients?.rows?.map((c: any) => c.id) || [];
      const page = clientIds.indexOf(clientId) + 1;

      const result = await query('SELECT * FROM clients WHERE id = ?', [clientId]) as any;
      const client = result?.rows?.[0];

      if (!client) {
        await ctx.answerCbQuery('Client not found');
        return;
      }

      const totalPages = clientIds.length;

      const message = `👤 Client (${page}/${totalPages})

━━━━━━━━━━━━━━━━━━━━━
📛 Name: ${client.name}
🏢 Type: ${client.type || 'INDIVIDUAL'}
📧 Email: ${client.email || 'N/A'}
📞 Phone: ${client.telephone || 'N/A'}
🌍 Nationality: ${client.nationality || 'N/A'}
🏙️ City: ${client.city || 'N/A'}
📍 Address: ${client.address_street || 'N/A'}
📅 Created: ${client.created_at ? new Date(client.created_at).toLocaleDateString() : 'N/A'}
━━━━━━━━━━━━━━━━━━━━━`;

      await ctx.editMessageText(message, buildClientDetailKeyboard(client.id, page, totalPages));
    } catch (error: any) {
      await ctx.answerCbQuery('Error: ' + error.message);
    }
  });

  // Delete with confirmation
  bot.action(/delete_confirm_(.+)/, async (ctx) => {
    ctx.answerCbQuery();
    const clientId = ctx.match[1];
    
    await ctx.editMessageText(
      `⚠️ Delete Client?

This will move the client to trash. You can restore it later.

Are you sure you want to delete this client?`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback('✅ Yes, Delete', `delete_yes_${clientId}`),
          Markup.button.callback('❌ Cancel', `delete_cancel_${clientId}`)
        ]
      ])
    );
  });

  bot.action(/delete_yes_(.+)/, async (ctx) => {
    const clientId = ctx.match[1];
    
    try {
      const { pool } = await import('../database/db.js');
      await pool.execute('UPDATE clients SET deleted_at = NOW() WHERE id = ?', [clientId]);
      
      ctx.answerCbQuery('✅ Client deleted!');
      await ctx.editMessageText('✅ Client has been moved to trash.');
      
      setTimeout(async () => {
        await showClientDetail(ctx, 1);
      }, 2000);
    } catch (error: any) {
      await ctx.answerCbQuery('Error: ' + error.message);
    }
  });

  bot.action(/delete_cancel_(.+)/, async (ctx) => {
    ctx.answerCbQuery('Cancelled');
    await ctx.deleteMessage();
    await showClientDetail(ctx, 1);
  });

  // Edit functionality
  bot.action(/edit_start_(.+)/, async (ctx) => {
    ctx.answerCbQuery();
    const clientId = ctx.match[1];
    
    await ctx.editMessageText(
      '✏️ Edit Client\n\n' +
      'This feature is coming soon! For now, use the web interface to edit clients.\n\n' +
      'https://eastafricanip.com/clients',
      Markup.inlineKeyboard([[Markup.button.callback('🔙 Back', `view_single_${clientId}`)]])
    );
  });

  bot.command('cases', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      await ctx.reply('❌ Unauthorized. Admin access only.');
      return;
    }

    try {
      const { query } = await import('../database/db.js');
      
      const result = await query(`
        SELECT tc.id, tc.mark_name, tc.status, tc.jurisdiction, tc.created_at,
               c.name as client_name
        FROM trademark_cases tc
        LEFT JOIN clients c ON tc.client_id = c.id
        WHERE tc.deleted_at IS NULL 
        ORDER BY tc.created_at DESC 
        LIMIT 15
      `) as any;
      const cases = result?.rows || [];

      if (cases.length === 0) {
        await ctx.reply('No cases found.', Markup.inlineKeyboard([[Markup.button.callback('🔙 Back to Menu', 'main_menu')]]));
        return;
      }

      let message = '📁 Recent Trademark Cases (Last 15):\n\n';
      for (const c of cases) {
        const markName = c.mark_name || 'Unnamed';
        const status = c.status || 'DRAFT';
        const jurisdiction = c.jurisdiction || 'ET';
        const clientName = c.client_name || 'No client';
        message += `• ${markName}\n`;
        message += `  Status: ${status} | Region: ${jurisdiction}\n`;
        message += `  Client: ${clientName}\n\n`;
      }

      await ctx.reply(message, Markup.inlineKeyboard([[Markup.button.callback('🔙 Back to Menu', 'main_menu')]]));
    } catch (error: any) {
      console.error('[Telegram Bot] Cases error:', error);
      await ctx.reply('❌ Error: ' + (error?.message || 'Unknown error'), Markup.inlineKeyboard([[Markup.button.callback('🔙 Back to Menu', 'main_menu')]]));
    }
  });

  bot.command('deadlines', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      await ctx.reply('❌ Unauthorized. Admin access only.');
      return;
    }

    try {
      const { query } = await import('../database/db.js');
      
      const result = await query(`
        SELECT d.id, d.type, d.due_date, d.is_completed,
               tc.mark_name
        FROM deadlines d
        JOIN trademark_cases tc ON d.case_id = tc.id
        WHERE d.is_completed = false AND tc.deleted_at IS NULL
        ORDER BY d.due_date ASC
        LIMIT 15
      `) as any;
      const deadlines = result?.rows || [];

      if (deadlines.length === 0) {
        await ctx.reply('No upcoming deadlines.');
        return;
      }

      let message = '⏰ Upcoming Deadlines (Next 15):\n\n';
      
      for (const d of deadlines) {
        const type = d.type || 'UNKNOWN';
        const dueDate = d.due_date ? new Date(d.due_date).toLocaleDateString() : 'N/A';
        const markName = d.mark_name || 'Unnamed';
        message += `• ${type} - ${markName}\n`;
        message += `  Due: ${dueDate}\n\n`;
      }

      await ctx.reply(message, Markup.inlineKeyboard([[Markup.button.callback('🔙 Back to Menu', 'main_menu')]]));
    } catch (error: any) {
      console.error('[Telegram Bot] Deadlines error:', error);
      await ctx.reply('❌ Error: ' + (error?.message || 'Unknown error'), Markup.inlineKeyboard([[Markup.button.callback('🔙 Back to Menu', 'main_menu')]]));
    }
  });

  return bot;
}

async function sendStats(ctx: any) {
  if (!isAdmin(ctx.from.id)) {
    await ctx.reply('❌ Unauthorized. Admin access only.');
    return;
  }

  try {
    const { query } = await import('../database/db.js');
    
    const clientsResult = await query('SELECT COUNT(*) as count FROM clients WHERE deleted_at IS NULL') as any;
    const casesResult = await query('SELECT COUNT(*) as count FROM trademark_cases WHERE deleted_at IS NULL') as any;
    const deadlinesResult = await query(`
      SELECT COUNT(*) as count FROM deadlines d 
      JOIN trademark_cases tc ON d.case_id = tc.id 
      WHERE d.is_completed = false AND tc.deleted_at IS NULL AND d.due_date <= DATE_ADD(NOW(), INTERVAL 7 DAY)
    `) as any;

    const stats = {
      clients: clientsResult?.rows?.[0]?.count || 0,
      cases: casesResult?.rows?.[0]?.count || 0,
      deadlines: deadlinesResult?.rows?.[0]?.count || 0
    };

    await ctx.reply(
      '📊 TPMS Dashboard Stats\n\n' +
      `👥 Total Clients: ${stats.clients}\n` +
      `📁 Total Cases: ${stats.cases}\n` +
      `⏰ Deadlines (next 7 days): ${stats.deadlines}`,
      Markup.inlineKeyboard([[Markup.button.callback('🔙 Back to Menu', 'main_menu')]])
    );
  } catch (error: any) {
    console.error('[Telegram Bot] Stats error:', error);
    await ctx.reply('❌ Error: ' + (error?.message || 'Unknown error'), Markup.inlineKeyboard([[Markup.button.callback('🔙 Back to Menu', 'main_menu')]]));
  }
}

async function sendCases(ctx: any) {
  if (!isAdmin(ctx.from.id)) {
    await ctx.reply('❌ Unauthorized. Admin access only.');
    return;
  }

  try {
    const { query } = await import('../database/db.js');
    
    const result = await query(`
      SELECT tc.id, tc.mark_name, tc.status, tc.jurisdiction, tc.created_at,
             c.name as client_name
      FROM trademark_cases tc
      LEFT JOIN clients c ON tc.client_id = c.id
      WHERE tc.deleted_at IS NULL 
      ORDER BY tc.created_at DESC 
      LIMIT 15
    `) as any;
    const cases = result?.rows || [];

    if (cases.length === 0) {
      await ctx.reply('No cases found.', Markup.inlineKeyboard([[Markup.button.callback('🔙 Back to Menu', 'main_menu')]]));
    }

    let message = '📁 Recent Trademark Cases (Last 15):\n\n';
    
    for (const c of cases) {
      const markName = c.mark_name || 'Unnamed';
      const status = c.status || 'DRAFT';
      const jurisdiction = c.jurisdiction || 'ET';
      const clientName = c.client_name || 'No client';
      message += `• ${markName}\n`;
      message += `  Status: ${status} | Region: ${jurisdiction}\n`;
      message += `  Client: ${clientName}\n\n`;
    }

    await ctx.reply(message, Markup.inlineKeyboard([[Markup.button.callback('🔙 Back to Menu', 'main_menu')]]));
  } catch (error: any) {
    console.error('[Telegram Bot] Cases error:', error);
    await ctx.reply('❌ Error: ' + (error?.message || 'Unknown error'), Markup.inlineKeyboard([[Markup.button.callback('🔙 Back to Menu', 'main_menu')]]));
  }
}

async function sendDeadlines(ctx: any) {
  if (!isAdmin(ctx.from.id)) {
    await ctx.reply('❌ Unauthorized. Admin access only.');
    return;
  }

  try {
    const { query } = await import('../database/db.js');
    
    const result = await query(`
      SELECT d.id, d.type, d.due_date, d.is_completed,
             tc.mark_name
      FROM deadlines d
      JOIN trademark_cases tc ON d.case_id = tc.id
      WHERE d.is_completed = false AND tc.deleted_at IS NULL
      ORDER BY d.due_date ASC
      LIMIT 15
    `) as any;
    const deadlines = result?.rows || [];

    if (deadlines.length === 0) {
      await ctx.reply('No upcoming deadlines.');
      return;
    }

    let message = '⏰ Upcoming Deadlines (Next 15):\n\n';
    
    for (const d of deadlines) {
      const type = d.type || 'UNKNOWN';
      const dueDate = d.due_date ? new Date(d.due_date).toLocaleDateString() : 'N/A';
      const markName = d.mark_name || 'Unnamed';
      message += `• ${type} - ${markName}\n`;
      message += `  Due: ${dueDate}\n\n`;
    }

    await ctx.reply(message, Markup.inlineKeyboard([[Markup.button.callback('🔙 Back to Menu', 'main_menu')]]));
  } catch (error: any) {
    console.error('[Telegram Bot] Deadlines error:', error);
    await ctx.reply('❌ Error: ' + (error?.message || 'Unknown error'), Markup.inlineKeyboard([[Markup.button.callback('🔙 Back to Menu', 'main_menu')]]));
  }
}

async function sendInvoices(ctx: any) {
  if (!isAdmin(ctx.from.id)) {
    await ctx.reply('❌ Unauthorized. Admin access only.');
    return;
  }

  try {
    const { query } = await import('../database/db.js');
      
    const result = await query(`
      SELECT i.id, i.invoice_number, i.total_amount, i.status, i.due_date, i.created_at,
             c.name as client_name
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE i.deleted_at IS NULL 
      ORDER BY i.created_at DESC 
      LIMIT 15
    `) as any;
    const invoices = result?.rows || [];

    if (invoices.length === 0) {
      await ctx.reply('No invoices found.', Markup.inlineKeyboard([[Markup.button.callback('🔙 Back to Menu', 'main_menu')]]));
      return;
    }

    let message = '💰 Recent Invoices (Last 15):\n\n';
    
    for (const inv of invoices) {
      const status = inv.status || 'DRAFT';
      const amount = inv.total_amount || 0;
      const dueDate = inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A';
      message += `• ${inv.invoice_number}\n`;
      message += `  Amount: $${amount} | Status: ${status}\n`;
      message += `  Client: ${inv.client_name || 'N/A'}\n`;
      message += `  Due: ${dueDate}\n\n`;
    }

    await ctx.reply(message, Markup.inlineKeyboard([[Markup.button.callback('🔙 Back to Menu', 'main_menu')]]));
  } catch (error: any) {
    console.error('[Telegram Bot] Invoices error:', error);
    await ctx.reply('❌ Error: ' + (error?.message || 'Unknown error'), Markup.inlineKeyboard([[Markup.button.callback('🔙 Back to Menu', 'main_menu')]]));
  }
}

async function sendTrash(ctx: any) {
  if (!isAdmin(ctx.from.id)) {
    await ctx.reply('❌ Unauthorized. Admin access only.');
    return;
  }

  try {
    const { query } = await import('../database/db.js');
      
    // Get counts from each table (deleted items)
    const clientsTrash = await query('SELECT COUNT(*) as count FROM clients WHERE deleted_at IS NOT NULL') as any;
    const casesTrash = await query('SELECT COUNT(*) as count FROM trademark_cases WHERE deleted_at IS NOT NULL') as any;
    const invoicesTrash = await query('SELECT COUNT(*) as count FROM invoices WHERE deleted_at IS NOT NULL') as any;

    const clientsCount = clientsTrash?.rows?.[0]?.count || 0;
    const casesCount = casesTrash?.rows?.[0]?.count || 0;
    const invoicesCount = invoicesTrash?.rows?.[0]?.count || 0;

    const keyboardButtons = [
      [Markup.button.callback('👥 Clients', 'trash_clients')],
      [Markup.button.callback('📁 Cases', 'trash_cases')],
      [Markup.button.callback('💰 Invoices', 'trash_invoices')],
      [Markup.button.callback('🔙 Back to Menu', 'main_menu')]
    ];

    const message = `🗑️ Trash

┌─────────────────┬───────────┐
│ Category        │ Total    │
├─────────────────┼───────────┤
│ 👥 Clients      │ ${String(clientsCount).padEnd(9)} │
│ 📁 Cases        │ ${String(casesCount).padEnd(9)} │
│ 💰 Invoices     │ ${String(invoicesCount).padEnd(9)} │
└─────────────────┴───────────┘

Click on a category below to view and restore items.`;

    await ctx.reply(message, Markup.inlineKeyboard(keyboardButtons));
  } catch (error: any) {
    console.error('[Telegram Bot] Trash error:', error);
    await ctx.reply('❌ Error: ' + (error?.message || 'Unknown error'), Markup.inlineKeyboard([[Markup.button.callback('🔙 Back to Trash', 'menu_trash')]]));
  }
}

bot.action('trash_clients', async (ctx) => {
  ctx.answerCbQuery();
  try {
    await showTrashItems(ctx, 'clients');
  } catch (err: any) {
    await ctx.editMessageText(`❌ Error: ${err?.message || 'Unknown error'}\n\nClick back to return:`, Markup.inlineKeyboard([[Markup.button.callback('🔙 Back to Trash', 'menu_trash')]]));
  }
});

bot.action('trash_cases', async (ctx) => {
  ctx.answerCbQuery();
  try {
    await showTrashItems(ctx, 'cases');
  } catch (err: any) {
    await ctx.editMessageText(`❌ Error: ${err?.message || 'Unknown error'}\n\nClick back to return:`, Markup.inlineKeyboard([[Markup.button.callback('🔙 Back to Trash', 'menu_trash')]]));
  }
});

bot.action('trash_invoices', async (ctx) => {
  ctx.answerCbQuery();
  try {
    await showTrashItems(ctx, 'invoices');
  } catch (err: any) {
    await ctx.editMessageText(`❌ Error: ${err?.message || 'Unknown error'}\n\nClick back to return:`, Markup.inlineKeyboard([[Markup.button.callback('🔙 Back to Trash', 'menu_trash')]]));
  }
});

async function showTrashItems(ctx: any, type: string) {
  try {
    const { query } = await import('../database/db.js');
    let items: any[] = [];
    let message = '';

    if (type === 'clients') {
      const result = await query(`
        SELECT id, name, email, telephone, deleted_at FROM clients 
        WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC LIMIT 15
      `) as any;
      items = result?.rows || [];
      message = '🗑️ Clients in Trash\n\n';
      for (const c of items) {
        const delDate = c.deleted_at ? new Date(c.deleted_at).toLocaleDateString() : 'N/A';
        message += `• ${c.name}\n`;
        message += `  ${c.email || 'N/A'} | Deleted: ${delDate}\n\n`;
      }
    } else if (type === 'cases') {
      const result = await query(`
        SELECT tc.id, tc.mark_name, tc.status, tc.jurisdiction, tc.deleted_at,
               c.name as client_name
        FROM trademark_cases tc
        LEFT JOIN clients c ON tc.client_id = c.id
        WHERE tc.deleted_at IS NOT NULL ORDER BY tc.deleted_at DESC LIMIT 15
      `) as any;
      items = result?.rows || [];
      message = '🗑️ Cases in Trash\n\n';
      for (const c of items) {
        const delDate = c.deleted_at ? new Date(c.deleted_at).toLocaleDateString() : 'N/A';
        message += `• ${c.mark_name || 'Unnamed'}\n`;
        message += `  ${c.status} | ${c.jurisdiction}\n`;
        message += `  Client: ${c.client_name || 'N/A'} | Deleted: ${delDate}\n\n`;
      }
    } else if (type === 'invoices') {
      const result = await query(`
        SELECT i.id, i.invoice_number, i.total_amount, i.status, i.deleted_at,
               c.name as client_name
        FROM invoices i
        LEFT JOIN clients c ON i.client_id = c.id
        WHERE i.deleted_at IS NOT NULL ORDER BY i.deleted_at DESC LIMIT 15
      `) as any;
      items = result?.rows || [];
      message = '🗑️ Invoices in Trash\n\n';
      for (const inv of items) {
        const delDate = inv.deleted_at ? new Date(inv.deleted_at).toLocaleDateString() : 'N/A';
        message += `• ${inv.invoice_number}\n`;
        message += `  $${inv.total_amount} | ${inv.status}\n`;
        message += `  Client: ${inv.client_name || 'N/A'} | Deleted: ${delDate}\n\n`;
      }
    }

    if (items.length === 0) {
      await ctx.editMessageText('No items found.', Markup.inlineKeyboard([[Markup.button.callback('🔙 Back to Trash', 'menu_trash')]]));
      return;
    }

    const keyboardRows: any[] = [];
    for (const item of items) {
      keyboardRows.push([
        Markup.button.callback(`🔄 Restore`, `restore_${type}_${item.id}`),
        Markup.button.callback(`🗑️ Delete`, `delete_perm_${type}_${item.id}`)
      ]);
    }
    keyboardRows.push([Markup.button.callback('🔙 Back to Trash', 'menu_trash')]);

    await ctx.editMessageText(message, Markup.inlineKeyboard(keyboardRows));
  } catch (error: any) {
    console.error('[Telegram Bot] Trash items error:', error);
    throw error;
  }
}

bot.action(/restore_(clients|cases|invoices)_(\d+)/, async (ctx) => {
  ctx.answerCbQuery();
  const type = ctx.match[1];
  const itemId = ctx.match[2];
  
  const itemName = type === 'clients' ? 'Client' : type === 'cases' ? 'Case' : 'Invoice';
  
  await ctx.editMessageText(
    `🔄 Restore ${itemName}?\n\nThis will restore the item back to its original location.\n\nAre you sure you want to restore this ${type.slice(0, -1)}?`,
    Markup.inlineKeyboard([
      [Markup.button.callback('✅ Yes, Restore', `restore_confirm_${type}_${itemId}`), Markup.button.callback('❌ No, Keep in Trash', `menu_trash`)],
      [Markup.button.callback('🔙 Back to Trash', 'menu_trash')]
    ])
  );
});

bot.action(/restore_confirm_(clients|cases|invoices)_(\d+)/, async (ctx) => {
  ctx.answerCbQuery();
  const type = ctx.match[1];
  const itemId = ctx.match[2];
  
  try {
    const tableName = type === 'clients' ? 'clients' : type === 'cases' ? 'trademark_cases' : 'invoices';
    // First check if item exists and is in trash
    const [check] = await pool.execute(`SELECT id, deleted_at FROM ${tableName} WHERE id = ?`, [itemId]) as any;
    console.log(`[Telegram Bot] Restore check:`, check);
    if (!check || check.length === 0) {
      throw new Error('Item not found');
    }
    if (check[0].deleted_at === null) {
      throw new Error('Item was already restored');
    }
    // Restore the item
    const [result] = await pool.execute(`UPDATE ${tableName} SET deleted_at = NULL WHERE id = ?`, [itemId]) as any;
    console.log(`[Telegram Bot] Restore: ${tableName} id=${itemId}, affectedRows=${result.affectedRows}`);
    // Verify restore worked
    const [verify] = await pool.execute(`SELECT id, deleted_at FROM ${tableName} WHERE id = ?`, [itemId]) as any;
    console.log(`[Telegram Bot] Restore verify:`, verify);
    
    await ctx.editMessageText('✅ Item restored successfully!', Markup.inlineKeyboard([[Markup.button.callback('🔙 Back to Trash', 'menu_trash')]]));
  } catch (err: any) {
    await ctx.editMessageText(`❌ Error restoring: ${err?.message || 'Unknown error'}`, Markup.inlineKeyboard([[Markup.button.callback('🔙 Back to Trash', 'menu_trash')]]));
  }
});

bot.action(/delete_perm_(clients|cases|invoices)_(\d+)/, async (ctx) => {
  ctx.answerCbQuery();
  const type = ctx.match[1];
  const itemId = ctx.match[2];
  
  const itemName = type === 'clients' ? 'Client' : type === 'cases' ? 'Case' : 'Invoice';
  
  await ctx.editMessageText(
    `⚠️ Permanently Delete ${itemName}?\n\nThis action cannot be undone. The item will be permanently removed from the system.\n\nAre you sure you want to permanently delete this ${type.slice(0, -1)}?`,
    Markup.inlineKeyboard([
      [Markup.button.callback('✅ Yes, Delete It', `delete_perm_confirm_${type}_${itemId}`), Markup.button.callback('❌ No, Don\'t Delete', `menu_trash`)],
      [Markup.button.callback('🔙 Back to Trash', 'menu_trash')]
    ])
  );
});

bot.action(/delete_perm_confirm_(clients|cases|invoices)_(\d+)/, async (ctx) => {
  ctx.answerCbQuery();
  const type = ctx.match[1];
  const itemId = ctx.match[2];
  
  try {
    const tableName = type === 'clients' ? 'clients' : type === 'cases' ? 'trademark_cases' : 'invoices';
    const [result] = await pool.execute(`DELETE FROM ${tableName} WHERE id = ?`, [itemId]) as any;
    console.log(`[Telegram Bot] Delete: ${tableName} id=${itemId}, affectedRows=${result.affectedRows}`);
    if (result.affectedRows === 0) {
      throw new Error('Item not found');
    }
    
    await ctx.editMessageText('✅ Item permanently deleted!', Markup.inlineKeyboard([[Markup.button.callback('🔙 Back to Trash', 'menu_trash')]]));
  } catch (err: any) {
    await ctx.editMessageText(`❌ Error deleting: ${err?.message || 'Unknown error'}`, Markup.inlineKeyboard([[Markup.button.callback('🔙 Back to Trash', 'menu_trash')]]));
  }
});

export async function sendTelegramMessage(chatId: string, message: string, keyboard?: any) {
  try {
    await bot.telegram.sendMessage(chatId, message, keyboard);
  } catch (error) {
    console.error('[Telegram Bot] Send message error:', error);
  }
}

export function startBot() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    console.log('[Telegram Bot] No token, not starting');
    return;
  }

  console.log('[Telegram Bot] Token loaded:', botToken.substring(0, 10) + '...');
  console.log('[Telegram Bot] Admin Chat ID:', process.env.TELEGRAM_ADMIN_CHAT_ID);

  bot.launch().then(() => {
    console.log('[Telegram Bot] Bot launched successfully!');
  }).catch((err) => {
    console.error('[Telegram Bot] Launch error:', err);
  });

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
