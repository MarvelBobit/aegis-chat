# How to Deploy Aegis Chat to Render.com

This folder is pre-configured for **1-click deployment on Render.com** (Free Web Service).

---

## 🚀 Easy Deployment Steps (Option 1: Via GitHub - Recommended)

1. **Upload to GitHub**:
   - Create a new repository on [GitHub](https://github.com/new) named `aegis-chat`.
   - Push this folder to your repository:
     ```bash
     git init
     git add .
     git commit -m "Initial Aegis Chat commit"
     git branch -M main
     git remote add origin https://github.com/YOUR_USERNAME/aegis-chat.git
     git push -u origin main
     ```

2. **Deploy on Render**:
   - Go to your [Render Dashboard](https://dashboard.render.com).
   - Click **New +** and select **Web Service**.
   - Connect your GitHub repository `aegis-chat`.
   - Render will automatically detect settings, or fill in:
     - **Name**: `aegis-chat`
     - **Environment**: `Node`
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
   - Click **Create Web Service**.

3. **Done!**
   - Render will install dependencies, build the client, and start the server.
   - You will get a live public HTTPS URL (e.g. `https://aegis-chat.onrender.com`).
   - Anyone on phone or web can now visit, create an account, get an ID, and start chatting securely!

---

## ⚡ Deployment Settings Summary

| Setting | Value |
| :--- | :--- |
| **Runtime** | Node.js |
| **Build Command** | `npm install` *(automatically installs server, client, and builds static files)* |
| **Start Command** | `npm start` *(runs `node server/server.js` on assigned Render port)* |
| **Node Version** | 18+ or 20+ |
