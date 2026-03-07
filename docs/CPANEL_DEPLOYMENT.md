# cPanel PostgreSQL Deployment Guide for TPMS

This guide walks you through setting up the PostgreSQL database on your A2 Hosting cPanel and connecting it to the TPMS application.

## **Step 1: Create the PostgreSQL Database in cPanel**
1.  **Log in** to your cPanel.
2.  Scroll down to the **Databases** section and click on **PostgreSQL® Database Wizard**.
3.  **Create a Database:** Enter a name (e.g., `falolega_tpms`) and click "Next Step".
4.  **Create a User:** Enter a username (e.g., `falolega_lawyer`) and a strong password. **Save these credentials.**
5.  **Add User to Database:** Ensure the user has all privileges on the database.

## **Step 2: Initialize the Schema**
1.  Go back to the cPanel Home.
2.  In the **Databases** section, click on **phpPgAdmin**.
3.  Select your new database from the left sidebar.
4.  Click on the **SQL** tab at the top.
5.  **Copy and Paste** the entire content of the `database_init.sql` file (provided in this project root) into the text area.
6.  Click **Execute**.

## **Step 3: Get your Connection String**
Your PostgreSQL connection string for the backend `.env` file will follow this format:
`postgresql://USERNAME:PASSWORD@localhost:5432/DATABASE_NAME?schema=public`

*Example:* `postgresql://falolega_lawyer:YourPassword123@localhost:5432/falolega_tpms?schema=public`

## **Step 4: Configure the API (Backend)**
1.  In cPanel **File Manager**, navigate to your API folder.
2.  Create or edit the `.env` file.
3.  Add your connection string:
    ```env
    DATABASE_URL="postgresql://falolega_lawyer:PASSWORD@localhost:5432/falolega_tpms?schema=public"
    NODE_ENV="production"
    ```

## **Step 5: Verify Deployment**
1.  Go to **phpPgAdmin**.
2.  Check the **Tables** section. You should see `trademark_cases`, `clients`, `deadlines`, etc.
3.  Check the **Views** section for `v_upcoming_deadlines`.

---
**Note:** If you encounter a "Permission Denied" error in phpPgAdmin while creating extensions, you may need to ask A2 Hosting support to enable the `uuid-ossp` extension for your account, or remove that line from the SQL script if UUIDs are handled by the application logic.
