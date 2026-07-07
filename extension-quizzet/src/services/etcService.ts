class EtcService {
  async textToSpeech(text: string, voice: string = "en-US-JennyNeural") {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_PYTHON}/edge-tts?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voice)}`,
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      return audioUrl;
    } catch (error) {
      console.error("TTS Error:", error);
      throw error;
    }
  }

  async enhanceWithAI(
    text: string,
    target_language: string = "tiếng việt",
    token: string = "",
  ) {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}/flashcards/translate`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ word: text, language: target_language }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Enhance with AI Error:", error);
      throw error;
    }
  }

  async createFlashcardWithAI(
    path: string,
    payload: any,
    token: string,
  ) {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}${path}`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Create Flashcard Error:", error);
      throw error;
    }
  }
}

export default new EtcService();
