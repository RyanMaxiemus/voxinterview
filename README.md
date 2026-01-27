# 🚀 VoxInterview

> Your voice-first AI interview coach. Get real-time, data-driven feedback on your spoken answers to role-specific questions, powered by Gemini AI and ElevenLabs TTS.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![Tech: React](https://img.shields.io/badge/Tech-React-61DAFB?logo=react)](https://reactjs.org/)
[![Tech: Node.js](https://img.shields.io/badge/Tech-Node.js-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![AI: Gemini](https://img.shields.io/badge/AI-Gemini-4285F4?logo=google&logoColor=white)](https://ai.google.dev/gemini-api)

---

## 🧐 What is this?

VoxInterview is a full-stack application designed to provide a realistic and effective mock interview experience. It addresses the common challenge of practicing spoken answers by integrating cutting-edge AI and voice technology. The system uses **ElevenLabs** for high-quality Text-to-Speech to ask questions and **Google's Gemini AI** to transcribe your audio response, analyze its content, and deliver immediate, actionable feedback. This is more than just a Q&A tool; it's a dedicated coach built to help developers and professionals refine their communication skills and boost confidence for their next technical interview.

## 🛠️ Tech Stack

This project is structured as a monorepo with a separate client (frontend) and server (backend).

| Component         | Technology         | Key Libraries/Frameworks                                                          |
| :---------------- | :----------------- | :-------------------------------------------------------------------------------- |
| **Frontend**      | JavaScript (React) | React (v19), Vite, `react-dom`                                                    |
| **Backend**       | Node.js (Express)  | Express, `@google/generative-ai`, `axios`, `multer` (for audio uploads), `helmet` |
| **Core Services** | AI & Voice APIs    | Google Gemini API, ElevenLabs API                                                 |
| **Development**   | Package Manager    | npm                                                                               |

## 🚀 Quick Start

The following instructions are optimized for a Linux environment (Ubuntu/Debian).

### Prerequisites

You must have **Node.js (v16+)** and **npm** installed.

1.  **Clone the repository**

    ```bash
    git clone https://github.com/RyanMaxiemus/VoxInterview.git
    cd VoxInterview
    ```

2.  **Configure Environment Variables**

    Create a file named `.env` in the root of the `VoxInterview` directory and populate it with your API keys.

    ```dotenv
    # Server Configuration
    PORT=3000
    NODE_ENV=development

    # API Keys
    ELEVENLABS_API_KEY="YOUR_ELEVENLABS_API_KEY"
    GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
    ```

3.  **Install Dependencies**

    Install dependencies for both the server and the client.

    ```bash
    # Install server dependencies
    cd server
    npm install

    # Install client dependencies
    cd ../client
    npm install
    ```

4.  **Run the Application**

    You will need two separate terminal sessions: one for the server and one for the client.

    **Terminal 1: Start the Server**

    ```bash
    cd server
    npm start
    # Server will run on http://localhost:3000
    ```

    **Terminal 2: Start the Client**

    ```bash
    cd client
    npm run dev
    # Client will typically run on http://localhost:5173
    ```

    Open your browser to the client URL (e.g., `http://localhost:5173`) to begin your mock interview.

## 📸 Preview

![VoxInterview Screenshot](/client/src/assets/VoxInterview-Screenshot.png)

## 🤝 Contributing

Found a bug? Have an idea for a new feature or a better way to analyze an answer? We welcome all contributions!

1.  **Open an Issue:** Before submitting a Pull Request, please open an issue to discuss the bug or feature you're working on. This helps prevent duplicate work and ensures alignment with the project's goals.
2.  **Fork and Branch:** Fork the repository and create a new branch for your contribution.
3.  **Code and Commit:** Write clean, well-documented code. Commit messages should be descriptive and follow a conventional format (e.g., `feat: add new role-specific questions`).
4.  **Submit a PR:** Submit a Pull Request against the `main` branch. We'll review it as quickly as possible.

Let's make VoxInterview the best interview coach available, together.
