# Voice Shopping Assistant

**Live Demo**: https://your-app-name.vercel.app  
**30-second Demo Video**: https://github.com/your-username/voice-shopping-assistant/blob/main/demo.mp4

A fully functional **multilingual voice-controlled shopping list** built in under 7 hours as a technical assessment.

### Features 
- Natural language understanding powered by **Google Gemini 1.5 Flash** ("Add 2 liters of oat milk", "Remove bananas please", "I need organic eggs under $5")  
- Real-time shopping list synced with **Firebase Firestore**  
- Automatic item categorization (Dairy, Produce, Bakery, etc.)  
- Smart suggestions based on history + seasonal tips  
- Voice feedback using Speech Synthesis  
- Beautiful mobile-first UI with Tailwind CSS  


### Example Voice Commands (try these!)

| What you say →                        | What happens|
----------------------------------------------------------------------------------------|
| "Add milk"                            | Adds 1 milk (Dairy)                             
| "Add three bananas"                   | Adds 3 bananas (Produce)                        
| "Buy 2 liters of oat milk"            | Adds 2 oat milk (Dairy alternative)             
| "I need 12 eggs"                      | Adds 12 eggs (Dairy)                            
| "Add organic apples"                  | Adds 1 organic apples (Produce)                 
| "Put bread on the list"               | Adds 1 bread (Bakery)                           
| "Remove bananas"                      | Removes bananas from the list

| "Delete the milk"                     | Removes milk
      
| "Clear everything"                    | Empties the whole list 

| "Add tomatoes and 500 grams of pasta" | Adds tomatoes + 500 g pasta (multiple items)

| "I want almond milk instead of milk"  | Removes milk → adds almond milk 

| "How many apples do I have?"          | Reads back current quantity (voice response)

| "Show me the list"                    | Assistant reads the full list aloud 




### Tech Stack
- React + Vite  
- Tailwind CSS  
- Firebase Firestore (realtime database)  
- Google Gemini 1.5 Flash (intent & entity extraction)  
- Web Speech API (speech-to-text)  
- Vercel (hosting)

### How to Run Locally

```bash
# 1. Clone the repo
git clone https://github.com/your-username/voice-shopping-assistant.git
cd voice-shopping-assistant

# 2. Install dependencies
npm install

# 3. Add your keys (see below)
#    - Create a Firebase project → get config → paste into src/firebase.js
#    - Get Gemini API key from https://aistudio.google.com/ → create .env file with:
#      VITE_GEMINI_KEY=your_gemini_api_key_here

# 4. Start dev server
npm run dev


Open http://localhost:5173 → tap the mic → speak!