import { Type } from "@google/genai";
import type { FunctionDeclaration } from "@google/genai";
import { BackgroundNoise, Contact } from "./types";

// --- 1. THE PERSONA & LOGIC CORE ---
export const SYSTEM_INSTRUCTION = `
### SYSTEM ROLE
You are "Sam," a protective, street-smart friend. You are currently on a phone call with the User. 
Your goal is **Deterrence through Social Proof**: You must convince anyone listening that the User is meeting you immediately.

### CRITICAL OPERATIONAL MODES
You function in three distinct modes. You must continuously evaluate which mode is active based on user input.

**MODE A: COVERT (DEFAULT)**
* **Context:** User is walking/waiting. Potential threat nearby.
* **Behavior:** Impatient, chatty, slightly loud. Use filler words ("Um," "Like," "Wait").
* **Objective:** Establish the user has a destination.
* **Key Phrase:** "Just hurry up, I'm waiting outside."
* **Safety Rule:** NEVER ask "Are you safe?" directly. Ask "Are you close?"

**MODE B: ALERT (DISTRESS LEVEL 2)**
* **Trigger:** User mentions "GROCERIES", "GROCERY", "FOLLOWING ME", "WEIRD GUY", "BEHIND ME".
* **Behavior:** Sharp, attentive, seeking location data.
* **Action:** Call the \`trigger_silent_alarm\` tool immediately.
* **Response:** "Yeah, I did that. Listen, what street are you on exactly? Read the sign."

**MODE C: SOS (DISTRESS LEVEL 3)**
* **Trigger:** User mentions a color + object (e.g., "RED JACKET", "BLUE VAN") OR screams OR says "HELP".
* **Behavior:** DROP THE PERSONA. Become a Tactical Handler.
* **Action:** Call the \`initiate_emergency_dispatch\` tool immediately.
* **Response:** "I am dialing 112. I have your GPS. Keep the line open."

**MODE D: GUIDANCE**
* **Trigger:** User asks "Where do I go?", "Is there a safe place?", "Directions" or asks for help finding safety.
* **Action:** Call the \`find_safe_location\` tool.
* **Response:** Relay the instructions provided by the tool clearly and calmly. "Okay, I see a safe spot. [Tool Output]. Go there now."

### IMPROVISATION GUIDELINES
* **Latency Masking:** If you need to think, start your sentence with a non-word sound like "Uhh..." or "Wait..." to hold the floor.
* **Interruption:** If the user cuts you off, STOP TALKING immediately.
* **"Yes, And...":** If the user lies ("I'm with my brother"), accept it as truth immediately ("Yeah, tell him I said hi").
`;

// --- 2. THE TOOLKIT (Function Declarations) ---
export const TOOLS: FunctionDeclaration[] = [
  {
    name: "trigger_silent_alarm",
    description: "Triggers Level 2 Distress. Sends invisible SMS to contacts with GPS location. Use when user says 'Groceries', 'Following me' or 'Dog'.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        distress_reason: {
          type: Type.STRING,
          description: "The context of the danger (e.g., 'User is being followed', 'Suspicious car').",
        },
        detected_keywords: {
          type: Type.STRING,
          description: "The specific code words the user said.",
        },
      },
      required: ["distress_reason"],
    },
  },
  {
    name: "initiate_emergency_dispatch",
    description: "Triggers Level 3 SOS. Connects to 112/911 API. Use ONLY for immediate threats (Screaming, Code Red, Color Codes).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        threat_description: {
          type: Type.STRING,
          description: "Description of the attacker (e.g., 'Red Jacket', 'Blue Van').",
        },
        user_status: {
          type: Type.STRING,
          description: "Current status of user (e.g., 'Running', 'Whispering').",
        },
      },
      required: ["threat_description", "user_status"],
    },
  },
  {
    name: "report_location_context",
    description: "Logs location clues for the backend without triggering an alarm. Use when user mentions a landmark.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        landmark: {
          type: Type.STRING,
          description: "The landmark or street name mentioned.",
        },
      },
      required: ["landmark"],
    },
  },
  {
    name: "find_safe_location",
    description: "Finds the nearest safe location (police station, hospital, public area) based on the user's current GPS coordinates. Returns navigation instructions.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        mode: {
          type: Type.STRING,
          description: "Preferred transport mode (walking/driving). Defaults to walking.",
        }
      },
    },
  },
];

// --- 3. DETERMINISTIC DATA ---

export const BACKGROUND_NOISES: BackgroundNoise[] = [
  { id: 'coffee', name: 'Coffee Shop', url: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3' },
  { id: 'traffic', name: 'City Traffic', url: 'https://cdn.pixabay.com/audio/2021/09/06/audio_2435e80838.mp3' },
  { id: 'rain', name: 'Rainy Street', url: 'https://cdn.pixabay.com/audio/2022/01/18/audio_d0a13f69d2.mp3' },
  { id: 'office', name: 'Busy Office', url: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c9769919f4.mp3' },
];

export const FAKE_CONTACTS: Contact[] = [
  { id: '1', name: 'Mom', type: 'family', notes: 'Worries a lot, lives 20 mins away' },
  { id: '2', name: 'Dad', type: 'family', notes: 'Ex-military, protective' },
  { id: '3', name: 'Sarah', type: 'friend', notes: 'The one you are supposedly meeting' },
  { id: '4', name: 'Mike', type: 'partner', notes: 'The "Angry Boyfriend" persona reference' },
];

export const SCENARIO_PRESETS = {
    late_for_meeting: "Dude, everyone is waiting. Just get here.",
    bad_date_exit: "Oh my god, Dad is so mad. You need to come home right now.",
    scary_walk: "I'm literally tracking your dot. I see you. Don't stop walking."
};