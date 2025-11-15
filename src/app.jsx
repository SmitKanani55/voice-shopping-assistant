import { useState, useEffect, useRef, useCallback } from "react"
import { db } from "./firebase"
import { collection, addDoc, deleteDoc, doc, onSnapshot } from "firebase/firestore"

const categories = { milk:"Dairy", eggs:"Dairy", bread:"Bakery", apple:"Produce", banana:"Produce" }
const suggestions = [
  "You often buy milk — want bread too?",
  "Avocado season is here!",
  "Oat milk is on sale this week"
]

export default function App() {
  const [items, setItems] = useState([])
  const [transcript, setTranscript] = useState("")
  const [listening, setListening] = useState(false)
  const [suggestion, setSuggestion] = useState("")
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const recognition = useRef(null)
  const itemsRef = useRef([])

  useEffect(() => {
    let unsub = null
    try {
      unsub = onSnapshot(collection(db, "items"), 
        snap => {
          try {
            const data = snap.docs.map(d => ({id: d.id, ...d.data()}))
            setItems(data)
            itemsRef.current = data
            setLoading(false)
            if (data.length > 2) setSuggestion(suggestions[Math.floor(Math.random()*suggestions.length)])
          } catch (e) {
            console.error("Error processing Firestore data:", e)
            setError("Error loading items")
            setLoading(false)
          }
        },
        err => {
          console.error("Firestore error:", err)
          setError("Connection error. Please refresh the page.")
          setLoading(false)
        }
      )
    } catch (e) {
      console.error("Firebase initialization error:", e)
      setError("Failed to connect to database")
      setLoading(false)
    }
    
    // Timeout fallback - show UI even if Firebase is slow
    const timeout = setTimeout(() => {
      if (loading) {
        setLoading(false)
        console.warn("Firebase connection timeout - showing UI anyway")
      }
    }, 3000)
    
    return () => {
      if (unsub) unsub()
      clearTimeout(timeout)
    }
  }, [])

  useEffect(() => {
    if (!("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) return
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    recognition.current = new SpeechRecognition()
    recognition.current.continuous = true
    recognition.current.interimResults = true

    recognition.current.onresult = async e => {
      const last = e.results[e.results.length-1]
      setTranscript(last[0].transcript)
      if (last.isFinal) {
        await process(last[0].transcript.toLowerCase())
        setTranscript("")
      }
    }
  }, [process])

  const speak = (txt) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(txt)
      window.speechSynthesis.speak(utterance)
    }
  }

  const process = useCallback(async (text) => {
    try {
      const apiKey = import.meta.env.VITE_GEMINI_KEY
      if (!apiKey) {
        throw new Error("VITE_GEMINI_KEY is not set")
      }
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Extract shopping intent, return ONLY JSON {action:"add|remove", name:string, qty:number|null}\n\n"${text}"`
            }]
          }],
          generationConfig: {
            temperature: 0
          }
        })
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(`API error: ${res.status} - ${errorData.error?.message || res.statusText}`)
      }
      
      const json = await res.json()
      
      if (!json.candidates || !json.candidates[0] || !json.candidates[0].content) {
        console.error("Unexpected API response:", json)
        throw new Error("Invalid response from API")
      }
      
      const responseText = json.candidates[0].content.parts[0].text
      if (!responseText) {
        throw new Error("Empty response from API")
      }
      
      const parsed = JSON.parse(responseText)

      if (parsed.action === "add") {
        await addDoc(collection(db, "items"), {
          name: parsed.name,
          qty: parsed.qty || 1,
          cat: categories[parsed.name] || "Other",
          ts: Date.now()
        })
        speak(`Added ${parsed.qty||1} ${parsed.name}`)
      } else if (parsed.action === "remove") {
        const item = itemsRef.current.find(i => i.name.includes(parsed.name))
        if (item) {
          await deleteDoc(doc(db, "items", item.id))
          speak("Removed")
        }
      }
    } catch (e) {
      console.error("Process error:", e)
      // simple fallback
      try {
        if (text.includes("add") || text.includes("buy")) {
          const name = text.split(" ").slice(-1)[0]
          await addDoc(collection(db, "items"), {name, qty:1, cat:"Other", ts:Date.now()})
          speak(`Added ${name}`)
        }
      } catch (fallbackError) {
        console.error("Fallback error:", fallbackError)
        speak("Sorry, I couldn't process that")
      }
    }
  }, [])

  const toggle = () => {
    if (listening) recognition.current?.stop()
    else recognition.current?.start()
    setListening(!listening)
  }


  if (loading) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-center mb-8">Voice Shopping List</h1>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error</p>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Reload Page
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-4xl font-bold text-center mb-8">Voice Shopping List</h1>

      {suggestion && <div className="bg-yellow-100 p-4 rounded mb-6 text-sm">Tip: {suggestion}</div>}

      <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
        <button onClick={toggle} className={`w-28 h-28 rounded-full text-6xl ${listening ? "bg-red-500 mic-pulse" : "bg-blue-600"} text-white shadow-2xl`}>
          Mic
        </button>
        <p className="mt-4 text-lg">{listening ? "Listening..." : "Tap & speak"}</p>
        {transcript && <p className="mt-3 italic text-gray-600">"{transcript}"</p>}
      </div>

      <div className="mt-8 space-y-3">
        {items.length === 0 ? <p className="text-center text-gray-400 py-12">List empty — all done!</p> :
          items.map(i => (
            <div key={i.id} className="bg-gray-50 p-4 rounded-xl flex justify-between">
              <div>
                <span className="font-medium">{i.qty>1 && `${i.qty}× `}{i.name}</span>
                <span className="text-xs text-gray-500 ml-2">{i.cat}</span>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  )
}
