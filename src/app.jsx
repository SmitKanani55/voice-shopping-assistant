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
  const recognition = useRef(null)
  const itemsRef = useRef([])

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "items"), snap => {
      const data = snap.docs.map(d => ({id: d.id, ...d.data()}))
      setItems(data)
      itemsRef.current = data
      if (data.length > 2) setSuggestion(suggestions[Math.floor(Math.random()*suggestions.length)])
    })
    return unsub
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
      const json = await res.json()
      const responseText = json.candidates[0].content.parts[0].text
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
      // simple fallback
      if (text.includes("add") || text.includes("buy")) {
        const name = text.split(" ").slice(-1)[0]
        await addDoc(collection(db, "items"), {name, qty:1, cat:"Other", ts:Date.now()})
        speak(`Added ${name}`)
      }
    }
  }, [])

  const toggle = () => {
    if (listening) recognition.current?.stop()
    else recognition.current?.start()
    setListening(!listening)
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
