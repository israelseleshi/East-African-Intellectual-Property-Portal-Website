# cPanel MySQL Deployment Guide for TPMS

This guide walks you through setting up the MySQL database on your A2 Hosting cPanel and connecting it to the TPMS application.

## **Step 1: Create the MySQL Database in cPanel**
1.  **Log in** to your cPanel.
2.  Scroll down to the **Databases** section and click on **MySQL® Database Wizard**.
3.  **Create a Database:** Enter a name (e.g., `falolega_tpms`) and click "Next Step".
4.  **Create a User:** Enter a username (e.g., `falolega_admin`) and a strong password. **Save these credentials.**
5.  **Add User to Database:** Ensure the user has "ALL PRIVILEGES".

## **Step 2: Initialize the Schema**
1.  Go back to the cPanel Home.
2.  In the **Databases** section, click on **phpMyAdmin**.
3.  Select your new database from the left sidebar.
4.  Click on the **Import** tab at the top.
5.  **Choose File:** Select the `database_schema.sql` file (found in the project root).
6.  Click **Go** at the bottom.

## **Step 3: Configure the API (Backend)**
1.  In cPanel **File Manager**, navigate to your API folder (`eastafricanip.com/api/`).
2.  Create or edit the `.env` file.
3.  Add your MySQL credentials:
    ```env
    DB_HOST="localhost"
    DB_USER="falolega_admin"
    DB_PASSWORD="YOUR_STRONG_PASSWORD"
    DB_NAME="falolega_tpms"
    DB_PORT=3306
    JWT_SECRET="your_secure_jwt_secret"
    NODE_ENV="production"
    ```

## **Step 4: Verify Deployment**
1.  Go to **phpMyAdmin**.
2.  Check the **Tables** section. You should see `trademark_cases`, `clients`, `deadlines`, etc.
3.  Check the **Health** endpoint: `https://eastafricanip.com/api/health`.

---
**Note:** If you are using a remote MySQL server, change `DB_HOST` from `localhost` to the remote server's IP/Hostname and ensure the remote server allows connections from your cPanel IP.
