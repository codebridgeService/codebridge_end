# Codebridge — Backend API

> **Innovate, Develop, Succeed**

The backend REST API for the Codebridge platform, providing robust data management, authentication, and integration services for the frontend application.

## 🚀 Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **Database ORM:** Prisma
- **Authentication:** Custom JWT Auth, Bcrypt.js
- **File Uploads & Storage:** Multer, Cloudinary
- **Email Services:** Nodemailer
- **API Documentation:** Swagger / OpenAPI

## 🛠️ Getting Started

### 1. Prerequisites
Ensure you have Node.js installed on your machine.

### 2. Environment Setup
Create a `.env` file in the `backend` directory and add your required environment variables. You will need variables for things like your database connection, JWT secret, Cloudinary, and SMTP credentials.
Example:
```env
DATABASE_URL="your_database_url_here"
JWT_SECRET="your_secret_key"
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Database Setup
Ensure your database is running, then generate the Prisma client:
```bash
npx prisma generate
```

*(Optional)* If you need to push the schema to your database:
```bash
npx prisma db push
```

### 5. Run the Development Server
```bash
npm run dev
```
The server will start with hot-reloading enabled.

## 📦 Build & Production

To build the TypeScript code into JavaScript:
```bash
npm run build
```

To start the production server:
```bash
npm start
```
# codebridge_end
