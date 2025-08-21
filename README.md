# 🪄 PotionPlay - Magic Cauldron

A magical webcam experience that uses AI to interpret what's brewing in your cauldron! This Next.js application captures frames from your camera and uses Google's Gemini 2.5 Flash AI to provide whimsical, magical interpretations of what it sees.

## ✨ Features

- **Live Webcam Feed**: Real-time video streaming from your device's camera
- **Frame Capture**: Capture still frames from the video feed
- **AI Magic Analysis**: Uses Google Gemini 2.5 Flash to analyze captured images with magical interpretations
- **Responsive Design**: Beautiful, mobile-friendly interface with magical theming
- **Static Export Ready**: Configured for static deployment

## 🔧 Setup

### Environment Variables

Before running the application, you need to set up your Google AI Studio API key:

1. Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a `.env.local` file in the root directory
3. Add your API key:

```env
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
```

⚠️ **Important Security Note**: Since this is a static export application, the API key will be embedded in the client-side bundle at build time and will be visible to users. For production applications, consider implementing a backend API to securely handle AI requests, or use API keys with restricted permissions and quotas.

### Installation

```bash
npm install
# or
yarn install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🚀 Usage

1. **Mount your device**: Position your camera to face into a cauldron or container
2. **Place objects**: Add ingredients, objects, or images into the cauldron
3. **Capture & Analyze**: Click the "Capture & Analyze Frame" button
4. **Enjoy the Magic**: Read the AI's whimsical interpretation of what's brewing!

## 🏗️ Building for Production

To build the application for production (static export):

```bash
npm run build
```

The built files will be in the `out/` directory, ready for static deployment.

### 🌐 Deployment

When deploying to static hosting services (Vercel, Netlify, GitHub Pages, etc.), make sure to:

1. **Set environment variables** in your deployment platform's settings:
   - Variable name: `GOOGLE_AI_API_KEY`
   - Value: Your Google AI Studio API key

2. **Common deployment platforms**:
   - **Vercel**: Add environment variables in Project Settings → Environment Variables
   - **Netlify**: Add in Site Settings → Environment Variables
   - **GitHub Pages**: Use GitHub Secrets and GitHub Actions for builds

The environment variable must be available at build time for the static export to work correctly.

## 🛠️ Development

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
