# 🪄 PotionPlay - Magic Cauldron

A magical webcam experience that uses AI to interpret what's brewing in your cauldron! This Next.js application captures frames from your camera and uses Google's Gemini AI to provide whimsical, magical interpretations of what it sees.

## ✨ Features

- **Live Webcam Feed**: Real-time video streaming from your device's camera
- **Frame Capture**: Capture still frames from the video feed
- **AI Magic Analysis**: Uses Google Gemini AI to analyze captured images with magical interpretations
- **Text-to-Speech**: Mystical voice narration using Web Speech API
- **Conversational AI**: Chat with your magical assistant about brewing techniques
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

⚠️ **Important Security Note**: This application uses Netlify Functions to securely handle AI API requests server-side, preventing API key exposure to clients. Your Google AI API key is stored securely in Netlify's environment variables.

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
5. **Chat with the AI**: Ask questions about your magical concoction
6. **Listen**: Enable text-to-speech for mystical voice narration

## 🏗️ Building for Production

To build the application for production (static export):

```bash
npm run build
```

The built files will be in the `out/` directory, ready for static deployment.

### 🌐 Deployment on Netlify (Recommended)

This application is optimized for deployment on Netlify with serverless functions to handle AI API calls securely and avoid CORS issues.

#### 🚀 Quick Deploy to Netlify

1. **Connect Repository**: Connect your GitHub repository to Netlify
2. **Build Settings**: Netlify will auto-detect the Next.js project
   - Build command: `npm run build`
   - Publish directory: `out`
   - Functions directory: `netlify/functions`

3. **Environment Variables**: In your Netlify dashboard, go to Site Settings → Environment Variables and add:
   ```
   GOOGLE_AI_API_KEY=your_google_ai_api_key_here
   ```

4. **Deploy**: Click "Deploy Site" and you're live! 🎉

#### 🔧 Manual Deployment

If deploying manually:

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build the project
npm run build

# Deploy to Netlify
netlify deploy --prod --dir=out --functions=netlify/functions
```

#### 🛠️ How It Works

- **Serverless Functions**: AI API calls are handled by Netlify Functions (`netlify/functions/`)
- **Static Frontend**: The Next.js app is exported as static files to the `out/` directory  
- **CORS Solved**: No more CORS issues since API calls happen server-side
- **Secure**: Your Google AI API key is never exposed to the client

#### 📁 Project Structure for Netlify
```
magic-cauldron/
├── netlify/
│   └── functions/           # Serverless functions for AI API calls
│       ├── interpret-image.ts
│       └── conversation.ts
├── out/                     # Static build output (auto-generated)
├── netlify.toml            # Netlify configuration
└── src/                    # Your Next.js app
```

#### 🔍 Available Endpoints
Once deployed, your functions will be available at:
- `https://your-site.netlify.app/.netlify/functions/interpret-image`
- `https://your-site.netlify.app/.netlify/functions/conversation`

#### ⚠️ Troubleshooting Netlify Deployment

**Functions not working?**
- Check that environment variables are set correctly in Netlify dashboard
- Verify your Google AI API key has proper permissions
- Check function logs in Netlify admin panel: Site Overview → Functions

**Build failing?**
- Make sure `@netlify/functions` is installed: `npm install @netlify/functions`
- Ensure `netlify.toml` is in your project root
- Check that Node.js version is 18+ in build settings

### 🌐 Other Deployment Platforms

For deployment on other platforms (Vercel, GitHub Pages, etc.), you'll need to implement your own backend API to handle Google AI requests, as these platforms don't support the same serverless function structure as Netlify.

## 🛠️ Development

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## 🏆 Recommended Hosting

**Netlify** is the recommended hosting platform for this application due to its excellent support for:
- Serverless functions (solves CORS issues)
- Static site hosting  
- Environment variable management
- Seamless deployment from Git

For other platforms, you'll need to implement your own backend API to securely handle Google AI requests.

## 📚 Additional Resources

- [Netlify Functions Documentation](https://docs.netlify.com/functions/overview/)
- [Google AI Studio](https://makersuite.google.com/app/apikey) - Get your API key
- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API
