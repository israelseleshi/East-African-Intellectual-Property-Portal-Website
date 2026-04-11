import { Disclosure } from '@headlessui/react'
import { CaretDown, BookOpen, Lifebuoy, PaperPlaneTilt, Compass, FileText, Receipt, ShieldCheck, Building, Note, Warning, Money, Bell, Trash, Files, Gavel } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'

export default function HelpPage() {
    const navigate = useNavigate()

    const faqCategories = [
        {
            name: "Getting Started",
            icon: Compass,
            questions: [
                {
                    question: "How do I create a new trademark application?",
                    answer: "Navigate to 'Intake' > 'New Application'. Fill out the EIPA-style form completely. Upon submission, the system will automatically create the case file and generate the official PDF form for you to download."
                },
                {
                    question: "How do I upload the signed Power of Attorney?",
                    answer: "Go to the 'Trademarks' page, click on the specific case, and use the 'Add File' button in the Documents section. Select 'POA' as the document type."
                }
            ]
        },
        {
            name: "Case Management",
            icon: Files,
            questions: [
                {
                    question: "What is the Jurisdiction Selector?",
                    answer: "The Jurisdiction Selector shows you the specific rules for each IP office (Ethiopia, Kenya, EAC, ARIPO, WIPO). It displays opposition periods, renewal years, and currency. When you select a jurisdiction, the system automatically configures deadlines and fees according to that country's rules."
                },
                {
                    question: "How do Case Notes work?",
                    answer: "Case Notes are threaded discussions attached to each trademark case. You can add different types of notes (General, Client Communication, Phone Call, Internal, Strategy). Notes can be marked as private (internal only) or pinned to stay at the top. You can also reply to notes to create threaded conversations."
                },
                {
                    question: "How do I track oppositions?",
                    answer: "Use the Opposition Section in any case to record third-party oppositions. Enter the opponent name, grounds for opposition, and opposition date. The system automatically calculates the response deadline based on jurisdiction rules (60 days for ET/KE). You'll see visual warnings as deadlines approach."
                },
                {
                    question: "How does the Fee Calculator work?",
                    answer: "The Fee Calculator shows estimated costs based on jurisdiction and case stage. It breaks down Official Fees (government charges) and Professional Fees (your legal fees). You can see costs per stage and total estimated fees for the entire case lifecycle."
                },
                {
                    question: "What are Notifications?",
                    answer: "The Notification system alerts you to important events: upcoming deadlines, status changes, opposition alerts, and invoice due dates. The bell icon in the top bar shows your unread count. Click it to see recent notifications or visit the Notifications page for full history."
                },
                {
                    question: "How does Soft Delete / Trash work?",
                    answer: "When you delete items, they go to Trash instead of being permanently removed. You can restore items from Trash within 30 days. After that, they may be automatically deleted. Only administrators can permanently delete items. Access Trash from the sidebar menu."
                }
            ]
        },
        {
            name: "Billing & Integrations",
            icon: Receipt,
            questions: [
                {
                    question: "How does the billing work?",
                    answer: "Invoices are generated automatically when a case moves to a billable stage (e.g., Filing, Publication). You can view all invoices in the 'Invoicing' tab. The system handles both Official Fees and Professional Fees."
                },
                {
                    question: "Can I connect my Google Calendar?",
                    answer: "Yes! Go to the 'Deadlines' page and click the 'Subscribe (Google Cal)' button. This will add a read-only calendar subscription to your Google Calendar so you never miss a deadline."
                }
            ]
        },
        {
            name: "Jurisdictions & Rules",
            icon: Gavel,
            questions: [
                {
                    question: "What jurisdictions are supported?",
                    answer: "TPMS currently supports: Ethiopia (EIPO - 7 year renewal, 60-day opposition), Kenya (KIPI - 10 year renewal, 60-day opposition), East African Community (EAC), African Regional IP Office (ARIPO), and WIPO Madrid Protocol. Each has specific fee schedules and rules configured."
                }
            ]
        }
    ]

    const newFeatureTours = [
        {
            title: "Jurisdiction Management",
            icon: ShieldCheck,
            color: "primary",
            description: "Learn how jurisdiction rules affect deadlines and fees.",
            route: "/eipa-forms?tour=jurisdiction"
        },
        {
            title: "Case Notes & Collaboration",
            icon: Note,
            color: "success",
            description: "Threaded discussions with privacy controls.",
            route: "/trademarks?tour=notes"
        },
        {
            title: "Opposition Tracking",
            icon: Warning,
            color: "warning",
            description: "Manage third-party oppositions and deadlines.",
            route: "/trademarks?tour=opposition"
        },
        {
            title: "Fee Calculator",
            icon: Money,
            color: "primary",
            description: "Real-time fee estimation by jurisdiction.",
            route: "/eipa-forms?tour=fees"
        },
        {
            title: "Notifications System",
            icon: Bell,
            color: "primary",
            description: "Stay informed of critical deadlines.",
            route: "/notifications?tour=true"
        },
        {
            title: "Trash & Recovery",
            icon: Trash,
            color: "warning",
            description: "Soft delete and data recovery.",
            route: "/trash?tour=true"
        }
    ]

    return (
        <div className="w-full max-w-4xl mx-auto space-y-12">
            <header className="text-center space-y-4">
                <h1 className="text-h1 text-[var(--eai-text)]">Help & Support</h1>
                <p className="text-body text-[var(--eai-text-secondary)] max-w-2xl mx-auto">
                    Everything you need to know about managing your IP portfolio with the East African IP Management System.
                </p>
            </header>

            {/* Interactive Tours */}
            <div className="space-y-6">
                <h2 className="text-h2 text-[var(--eai-text)] border-b border-[var(--eai-border)] pb-4">
                    Interactive Tours
                </h2>
                <div className="grid md:grid-cols-5 gap-4">
                    {/* Dashboard Tour */}
                    <div className="apple-card p-5 flex flex-col items-center text-center gap-3 group relative overflow-hidden">
                        <div className="h-12 w-12 rounded-full bg-[var(--eai-primary)]/10 text-[var(--eai-primary)] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <Compass size={28} weight="duotone" />
                        </div>
                        <h3 className="text-h3 text-sm">Dashboard</h3>
                        <p className="text-label text-xs normal-case font-medium line-clamp-2">Practice dashboard overview.</p>
                        <button onClick={() => navigate('/?tour=true')} className="apple-button-primary text-micro w-full text-xs py-2">Start tour</button>
                    </div>

                    {/* Clients Tour */}
                    <div className="apple-card p-5 flex flex-col items-center text-center gap-3 group relative overflow-hidden">
                        <div className="h-12 w-12 rounded-full bg-[var(--eai-success)]/10 text-[var(--eai-success)] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <Building size={28} weight="duotone" />
                        </div>
                        <h3 className="text-h3 text-sm">Clients</h3>
                        <p className="text-label text-xs normal-case font-medium line-clamp-2">Client database management.</p>
                        <button onClick={() => navigate('/clients?tour=true')} className="apple-button-primary text-micro w-full text-xs py-2">Start tour</button>
                    </div>

                    {/* Forms Tour */}
                    <div className="apple-card p-5 flex flex-col items-center text-center gap-3 group relative overflow-hidden">
                        <div className="h-12 w-12 rounded-full bg-[var(--eai-success)]/10 text-[var(--eai-success)] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <FileText size={28} weight="duotone" />
                        </div>
                        <h3 className="text-h3 text-sm">Forms</h3>
                        <p className="text-label text-xs normal-case font-medium line-clamp-2">Automated EIPA form filler.</p>
                        <button onClick={() => navigate('/eipa-forms?tour=true')} className="apple-button-primary text-micro w-full text-xs py-2">Start tour</button>
                    </div>

                    {/* Billing Tour */}
                    <div className="apple-card p-5 flex flex-col items-center text-center gap-3 group relative overflow-hidden">
                        <div className="h-12 w-12 rounded-full bg-[var(--eai-warning)]/10 text-[var(--eai-warning)] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <Receipt size={28} weight="duotone" />
                        </div>
                        <h3 className="text-h3 text-sm">Billing</h3>
                        <p className="text-label text-xs normal-case font-medium line-clamp-2">Invoices and fees guide.</p>
                        <button onClick={() => navigate('/invoicing?tour=true')} className="apple-button-primary text-micro w-full text-xs py-2">Start tour</button>
                    </div>

                    {/* Trademarks Tour */}
                    <div className="apple-card p-5 flex flex-col items-center text-center gap-3 group relative overflow-hidden">
                        <div className="h-12 w-12 rounded-full bg-[var(--eai-primary)]/10 text-[var(--eai-primary)] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <ShieldCheck size={28} weight="duotone" />
                        </div>
                        <h3 className="text-h3 text-sm">Trademarks</h3>
                        <p className="text-label text-xs normal-case font-medium line-clamp-2">Docket and case management.</p>
                        <button onClick={() => navigate('/trademarks?tour=true')} className="apple-button-primary text-micro w-full text-xs py-2">Start tour</button>
                    </div>
                </div>
            </div>

            {/* Advanced Feature Tours */}
            <div className="space-y-6">
                <h2 className="text-h2 text-[var(--eai-text)] border-b border-[var(--eai-border)] pb-4">
                    Advanced Features
                </h2>
                <div className="grid md:grid-cols-3 gap-6">
                    {newFeatureTours.map((tour, idx) => {
                        const Icon = tour.icon
                        const colorClass = tour.color === 'primary' ? 'bg-[var(--eai-primary)]/10 text-[var(--eai-primary)]' :
                                          tour.color === 'success' ? 'bg-[var(--eai-success)]/10 text-[var(--eai-success)]' :
                                          'bg-[var(--eai-warning)]/10 text-[var(--eai-warning)]'
                        return (
                            <div key={idx} className="apple-card p-6 flex flex-col items-center text-center gap-4 group relative overflow-hidden">
                                <div className={`h-14 w-14 rounded-full ${colorClass} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                                    <Icon size={32} weight="duotone" />
                                </div>
                                <h3 className="text-h3">{tour.title}</h3>
                                <p className="text-label normal-case font-medium">{tour.description}</p>
                                <button 
                                    onClick={() => navigate(tour.route)}
                                    className="apple-button-primary text-micro w-full"
                                >
                                    Start tour
                                </button>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* User Guide & Support */}
            <div className="space-y-6">
                <h2 className="text-h2 text-[var(--eai-text)] border-b border-[var(--eai-border)] pb-4">
                    Documentation & Support
                </h2>
                <div className="grid md:grid-cols-3 gap-6">
                    {/* User Guide */}
                    <div className="apple-card p-6 flex flex-col items-center text-center gap-4 group relative overflow-hidden">
                        <div className="h-14 w-14 rounded-full bg-[var(--eai-primary)]/10 text-[var(--eai-primary)] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <BookOpen size={32} weight="duotone" />
                        </div>
                        <h3 className="text-h3">User Guide</h3>
                        <p className="text-label normal-case font-medium">Detailed documentation on every feature.</p>
                        <button className="apple-button-secondary text-micro w-full">Read guide</button>
                    </div>

                    {/* Support Ticket */}
                    <div className="apple-card p-6 flex flex-col items-center text-center gap-4 group relative overflow-hidden">
                        <div className="h-14 w-14 rounded-full bg-[var(--eai-warning)]/10 text-[var(--eai-warning)] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <Lifebuoy size={32} weight="duotone" />
                        </div>
                        <h3 className="text-h3">Support Ticket</h3>
                        <p className="text-label normal-case font-medium">Facing a bug? Open a priority ticket.</p>
                        <button className="apple-button-secondary text-micro w-full">Contact support</button>
                    </div>

                    {/* Email Us */}
                    <div className="apple-card p-6 flex flex-col items-center text-center gap-4 group relative overflow-hidden">
                        <div className="h-14 w-14 rounded-full bg-[var(--eai-success)]/10 text-[var(--eai-success)] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <PaperPlaneTilt size={32} weight="duotone" />
                        </div>
                        <h3 className="text-h3">Email Us</h3>
                        <p className="text-label normal-case font-medium">Direct email support for legal queries.</p>
                        <button className="apple-button-secondary text-micro w-full whitespace-nowrap overflow-hidden text-ellipsis">support@eai.com</button>
                    </div>
                </div>
            </div>

            {/* Categorized FAQs */}
            <div className="space-y-6">
                <h2 className="text-h2 text-[var(--eai-text)] border-b border-[var(--eai-border)] pb-4">
                    Frequently Asked Questions
                </h2>
                <div className="space-y-8">
                    {faqCategories.map((category, catIdx) => {
                        const Icon = category.icon
                        return (
                            <div key={catIdx} className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Icon size={20} weight="duotone" />
                                    <h3 className="text-h3 text-[var(--eai-text)]">{category.name}</h3>
                                    <span className="text-sm text-[var(--eai-text-secondary)] bg-[var(--eai-bg)] px-2 py-1 rounded-full">
                                        {category.questions.length} questions
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    {category.questions.map((faq, idx) => (
                                        <Disclosure key={idx} as="div" className="apple-card overflow-hidden">
                                            {({ open }) => (
                                                <>
                                                    <Disclosure.Button className="flex w-full justify-between items-center px-6 py-4 text-left hover:bg-[var(--eai-bg)] transition-colors">
                                                        <span className="text-body font-bold text-[var(--eai-text)]">{faq.question}</span>
                                                        <CaretDown
                                                            weight="bold"
                                                            className={`${open ? 'rotate-180 transform' : ''} h-5 w-5 text-[var(--eai-text-secondary)] transition-transform`}
                                                        />
                                                    </Disclosure.Button>
                                                    <Disclosure.Panel className="px-6 py-4 text-body text-[var(--eai-text-secondary)] border-t border-[var(--eai-border)] bg-[var(--eai-bg)]/30">
                                                        {faq.answer}
                                                    </Disclosure.Panel>
                                                </>
                                            )}
                                        </Disclosure>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
