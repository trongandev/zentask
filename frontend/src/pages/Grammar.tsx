import { Prepositions } from "../components/grammar/Prepositions";
import { Conditionals } from "../components/grammar/Conditionals";
import { Nouns } from "../components/grammar/Nouns";
import { PassiveVoice } from "../components/grammar/PassiveVoice";

export function Grammar() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <img src="/mascot/Lopy (15).png" className="w-16 h-16 object-contain drop-shadow-md" alt="Mascot" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Cốt lõi Ngữ pháp (Grammar)</h1>
          <p className="text-gray-500">Học ngữ pháp một cách trực quan, sinh động và dễ nhớ.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Prepositions />
        <Conditionals />
        <Nouns />
        <PassiveVoice />
      </div>
    </div>
  );
}
