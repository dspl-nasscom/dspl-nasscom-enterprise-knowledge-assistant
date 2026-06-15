# DSPL Nasscom Enterprise Knowledge Base Copilot

[![Next.js](https://img.shields.io/badge/Next.js-15%2B-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5%2B-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![MUI](https://img.shields.io/badge/MUI-7%2B-007FFF?style=for-the-badge&logo=mui)](https://mui.com/)
[![Firebase](https://img.shields.io/badge/Firebase-12%2B-FFCA28?style=for-the-badge&logo=firebase)](https://firebase.google.com/)

The **Enterprise Knowledge Base Copilot** is a high-performance, AI Assistant and Support Ticketing platform. Engineered with Next.js 15+ and Material UI 7, it provides a seamless bridge between complex organizational data and intelligent action, enabling fast knowledge discovery and automated support resolution.

---

## Key Features

- **AI Knowledge Assistant**: Real-time chat interface featuring **React-Markdown** rendering, **Syntax-Highlighter** for code blocks, and localized **source citation** with secure URL mapping.
- **Ticket Lifecycle Management**: Comprehensive support system with dedicated views for **Admins** and **Users**, including status transitions, author attribution, and live comment threads.
- **Document Ingestion**: Advanced pipeline supporting **multiple concurrent uploads** with **30MB constraints**, secure **GCS proxying**, and a detailed **ingestion summary dashboard**.
- **Configuration**: Advanced controls for tuning AI confidence thresholds, search retrieval parameters, and **PII masking** protocols.
- **User & Role Administration**: Robust management console for user provisioning, featuring **server-side pagination** and dynamic filtering.
- **Modern Design System**: A premium, responsive interface built on **MUI 7**, featuring **glassmorphic** backdrop effects and fluid sidebar navigation.

---

## Tech Stack

| Layer              | Technology                          |
| :----------------- | :---------------------------------- |
| **Framework**      | Next.js 15+                         |
| **Language**       | TypeScript                          |
| **UI Library**     | Material UI (MUI) 7                 |
| **Authentication** | Firebase Auth                       |
| **Icons**          | Tabler Icons                        |
| **Animations**     | Framer Motion                       |
| **Content**        | React Markdown / syntax-highlighter |

---

## Getting Started

### Prerequisites

- **Node.js**: v24.0.0 or higher
- **npm**: v11.0.0 or higher
- **Firebase Account**: Access to a Firebase project for Authentication.

### Firebase Setup

To get your application up and running with Firebase:

1. **Create a Firebase Project**: If firebase project is not created, Visit the [Firebase Console](https://console.firebase.google.com/) and initialize a new project other wise use the existing project.
2. **Enable Authentication**: Navigate to the **Authentication** section. Enable the **Google** sign-in methods.
3. **Register a Web App**:
   - In the Project Settings, click on the **Web library (</>)** icon.
   - Provide an app nickname and click **Register app**.
4. **Retrieve Credentials**: Under the "SDK setup and configuration" section, select **Config**. You will find the values needed for your `.env` file.

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/dspl-saas-poc/dspl-nasscom-ent-kb-copilot-frontend.git
   cd dspl-nasscom-ent-kb-copilot-frontend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory and populate it with your credentials:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=firebase_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=firebase_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=firebase_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=firebase_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=firebase_app_id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=measurement_id
   COPILOT_BACKEND_URL=https://your-backend-api.run.app
   ```

### Running Locally

```bash
# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Usage

### Knowledge Assistant

Navigate to the **Knowledge Assistant** tab to interact with your organization's data. You can ask complex questions, and the assistant will provide answers backed by document citations.

### Managing Tickets

The platform features an intelligent escalation workflow. If the **Knowledge Assistant** cannot find a satisfactory answer within the knowledge base, it automatically creates a support ticket on the user's behalf. Admins can then review these escalations via the **Ticket Management** dashboard, where they can provide human-in-the-loop resolutions, and communicate with the user via comments.

### Document Ingestion

Administrators can expand the platform's intelligence by uploading multiple organizational documents simultaneously via the **Documents** page. The system supports bulk ingestion of files (up to 30MB each) and provides a comprehensive **Upload Summary** upon completion, detailing the processing status of each file.

### User Management

Control system access and permissions through the **User Management** console. Administrators can monitor and manage role assignments with server side filtering and pagination.

### Configuration

Fine-tune the knowledge assistant behavior via the **Configuration** dashboard. Administrators can adjust the **Confidence Threshold**—the minimum score required before the system automatically escalates a query to a support ticket—and manage advanced retrieval parameters like **Top K** search and **PII Masking** for enhanced security.

---

## Testing

```bash
# Run linting checks
npm run lint

# Build for production
npm run build
```

---

Developed by **DevAgentix Team**
