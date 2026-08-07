import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AnalyzeRequest {
  feedback: string;
  pagesRead?: number;
  decision?: string;
}

interface QualityResult {
  score: number;
  reasons: string[];
  factors: {
    explainsWhy: boolean;
    referencesStoryElements: boolean;
    identifiesIssues: boolean;
    isConstructive: boolean;
    hasSpecificObservations: boolean;
  };
}

function analyzeFeedback(feedback: string, pagesRead: number, decision: string): QualityResult {
  const lower = feedback.toLowerCase();
  const words = feedback.trim().split(/\s+/);
  const wordCount = words.length;
  let score = 0;
  const reasons: string[] = [];
  const factors = {
    explainsWhy: false,
    referencesStoryElements: false,
    identifiesIssues: false,
    isConstructive: false,
    hasSpecificObservations: false,
  };

  // 1. Explains why (up to 25 points)
  const whyPatterns = [
    /\b(because|since|due to|as a result|so|therefore|which is why|that's why|reason|stopped because|lost interest because)\b/i,
    /\bthe (main|key|primary) (reason|issue|problem)\b/i,
    /\bi (stopped|kept reading|lost interest|felt)\b/i,
  ];
  if (whyPatterns.some((p) => p.test(feedback))) {
    score += 20;
    factors.explainsWhy = true;
    reasons.push("Explains reasoning");
  }
  if (wordCount >= 25) {
    score += 5;
    factors.explainsWhy = true;
  }

  // 2. References specific story elements (up to 25 points)
  const storyElements = [
    { pattern: /\b(character|protagonist|hero|villain|antagonist|narrator|side character|main character)\b/i, label: "character" },
    { pattern: /\b(dialogue|conversation|monologue|speech|lines|spoken)\b/i, label: "dialogue" },
    { pattern: /\b(pacing|tempo|rhythm|momentum|flow)\b/i, label: "pacing" },
    { pattern: /\b(structure|act|scene|plot|storyline|narrative|arc|story)\b/i, label: "structure" },
    { pattern: /\b(theme|message|meaning|subtext|motif)\b/i, label: "theme" },
    { pattern: /\b(setting|world|location|environment|atmosphere)\b/i, label: "setting" },
    { pattern: /\b(conflict|tension|stakes|obstacle|antagonism)\b/i, label: "conflict" },
    { pattern: /\b(opening|intro|beginning|first (page|scene)|cold open|hook)\b/i, label: "opening" },
    { pattern: /\b(ending|climax|resolution|finale|conclusion|third act)\b/i, label: "ending" },
    { pattern: /\b(motivation|goal|desire|want|need|arc|journey|transformation)\b/i, label: "character arc" },
  ];
  let elementCount = 0;
  const referencedElements: string[] = [];
  for (const el of storyElements) {
    if (el.pattern.test(feedback)) {
      elementCount++;
      referencedElements.push(el.label);
    }
  }
  if (elementCount >= 1) {
    score += 8;
    factors.referencesStoryElements = true;
  }
  if (elementCount >= 2) {
    score += 8;
  }
  if (elementCount >= 3) {
    score += 9;
    factors.hasSpecificObservations = true;
    reasons.push(`References specific elements: ${referencedElements.slice(0, 3).join(", ")}`);
  }

  // 3. Identifies specific issues (up to 25 points)
  const issuePatterns = [
    /\b(unclear|confusing|didn't understand|hard to follow|muddled|convoluted)\b/i,
    /\b(slow|dragged|pacing issue|too long|felt rushed|felt slow)\b/i,
    /\b(flat|bland|generic|clich|predictable|unoriginal|derivative)\b/i,
    /\b(weak|poor|strong|compelling|engaging|gripping|boring)\b/i,
    /\b(no (clear )?(goal|motivation|stakes|conflict))\b/i,
    /\b(didn't (care|connect|engage|invest))\b/i,
    /\b(tone (deaf|inconsistent|shifts))\b/i,
    /\b(exposition|info dump|on the nose|telling not showing)\b/i,
  ];
  let issueCount = 0;
  for (const p of issuePatterns) {
    if (p.test(feedback)) issueCount++;
  }
  if (issueCount >= 1) {
    score += 12;
    factors.identifiesIssues = true;
  }
  if (issueCount >= 2) {
    score += 13;
    reasons.push("Identifies specific craft issues");
  }

  // 4. Constructive rather than just negative (up to 15 points)
  const constructivePatterns = [
    /\b(could|would|might|suggest|consider|if (only|they|it)|would have been (better|improved))\b/i,
    /\b(improvement|improve|enhance|strengthen|develop|build|refine)\b/i,
    /\b(worked (well|best)|succeeded|strong (point|aspect)|effective|well done)\b/i,
    /\b(but|however|although|while|on the other hand)\b/i,
  ];
  let constructiveCount = 0;
  for (const p of constructivePatterns) {
    if (p.test(feedback)) constructiveCount++;
  }
  if (constructiveCount >= 1) {
    score += 8;
    factors.isConstructive = true;
  }
  if (constructiveCount >= 2) {
    score += 7;
    reasons.push("Constructive and balanced");
  }

  // 5. Specificity — uses specific page/scene references (up to 10 points)
  if (/\b(page \d+|scene \d+|the (first|second|third|opening|closing) (scene|act|page))\b/i.test(feedback)) {
    score += 10;
    factors.hasSpecificObservations = true;
    reasons.push("References specific scenes or pages");
  }

  // Penalty: very short feedback even if it passes length check
  if (wordCount < 15) {
    score -= 10;
    reasons.push("Penalty: very short feedback");
  }

  // Penalty: generic-only phrases without substance
  const genericOnly = /^(not good|didn't like it|bad script|it was (fine|ok|okay)|good|bad|nice|interesting)\s*\.?$/i;
  if (genericOnly.test(feedback.trim())) {
    score = 5;
    reasons.length = 0;
    reasons.push("Generic opinion without substance");
  }

  // Clamp score 0-100
  score = Math.max(0, Math.min(100, score));

  return { score, reasons, factors };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { feedback, pagesRead, decision } = (await req.json()) as AnalyzeRequest;

    if (!feedback || typeof feedback !== "string") {
      return new Response(
        JSON.stringify({ error: "Feedback text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const pages = pagesRead ?? 0;
    const dec = decision ?? "stopped";

    const result = analyzeFeedback(feedback, pages, dec);

    return new Response(
      JSON.stringify({
        score: result.score,
        reasons: result.reasons,
        factors: result.factors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Analysis failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
