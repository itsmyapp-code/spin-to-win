# Customer Import & Mailchimp Email Campaign Guide

This guide details how to onboard customer records to the **Promotional Spin Hub**, generate unique spin tokens, and export them into an email marketing platform like **Mailchimp** for distribution.

---

## Step 1: Generate Customer Links in the Admin Portal

The application includes an **Admin Data Onboarding Matrix** designed for bulk-generating user tokens.

1. Navigate to the **Admin Portal** in the application (Admin authentication required).
2. Set the **Allowed Spins Per Customer** (default is `1`).
3. Prepare your list of customers in a simple comma-separated (CSV) format:
   ```csv
   John Smith, john.smith@example.co.uk
   Jane Doe, jane.doe@example.co.uk
   Sarah Jenkins, sjenkins@example.co.uk
   ```
4. Paste this raw list into the **Raw CSV Input** text box.
5. Click **Execute Bulk Parse & Generate Access Tokens**.
6. Review the list in the preview table on the right to ensure names, emails, and tokens are correctly generated.
7. Click **Execute Bulk Firestore Import** to save the records securely to your Firestore database.
8. Click the **Copy All Links** button. This copies the parsed records as tab-separated columns to your clipboard:
   ```text
   John Smith   john.smith@example.co.uk   https://yourdomain.com/?token=ABCDEFGH
   Jane Doe     jane.doe@example.co.uk     https://yourdomain.com/?token=IJKLMNOP
   ```

---

## Step 2: Prepare Your Mailchimp Import File

To email these links, we need to map the unique URL (the spin token URL) to each contact record in Mailchimp.

1. Paste your copied list from the clipboard into a spreadsheet editor (e.g. Microsoft Excel, Google Sheets).
2. Add column headers: `Name`, `Email`, and `SpinURL`.
3. Save the sheet as a `.csv` file (e.g. `spin_campaign_contacts.csv`).

Example CSV structure:
```csv
Name,Email,SpinURL
John Smith,john.smith@example.co.uk,https://yourdomain.com/?token=ABCDEFGH
Jane Doe,jane.doe@example.co.uk,https://yourdomain.com/?token=IJKLMNOP
```

---

## Step 3: Import Contacts and Custom Field to Mailchimp

### 1. Create a Custom Field (Merge Tag) in Mailchimp
Before importing, configure Mailchimp to accept the custom `SpinURL` link:
1. Log in to your Mailchimp account and go to **Audience** > **All contacts**.
2. Click the **Settings** dropdown and select **Audience fields and *|MERGE|* tags**.
3. Scroll to the bottom and click **Add A Field**.
4. Select **Website** (or **Text**).
5. Name the field **Spin URL** and set the tag identifier to `SPINURL` (so it compiles as `*|SPINURL|*`).
6. Click **Save Changes**.

### 2. Upload the CSV File
1. In Mailchimp, click **Add Contacts** > **Import contacts**.
2. Choose **Upload a file** (CSV) and click **Continue**.
3. Browse and select your `spin_campaign_contacts.csv` file.
4. Match your columns:
   - Map `Name` to Mailchimp's **First Name** (or Full Name).
   - Map `Email` to Mailchimp's **Email Address**.
   - Map `SpinURL` to your custom **Spin URL** field (`*|SPINURL|*`).
5. Choose their marketing status (e.g., *Subscribed*) and tag them (e.g., `Spin Wheel June 2026`).
6. Complete the import.

---

## Step 4: Build and Send the Email Campaign

Now, design your email template to include the personalized spin buttons.

1. Create a new Campaign (Regular Email).
2. In the email builder, place a call-to-action **Button** element.
3. In the button configuration panel, set the **Link to** property to **Web Address**.
4. In the URL field, insert the Mailchimp merge tag:
   ```text
   *|SPINURL|*
   ```
5. Label the button clearly, for example: `★ Spin the Wheel to Win ★`.
6. Add personal copy to your email using standard merge tags:
   ```text
   Hi *|FNAME|*,

   Thank you for supporting us. As a special thank you, we have credited you with a promotional spin!

   Click the link below to spin the wheel and reveal your prize:
   ```

### 💡 Testing Your Campaign
Before sending, click **Preview** > **Enter preview mode** in Mailchimp. Toggle the **Enable merge tag info** switch. Mailchimp will replace `*|SPINURL|*` with an example URL (e.g., `https://yourdomain.com/?token=ABCDEFGH`) to verify that the button links behave correctly.
