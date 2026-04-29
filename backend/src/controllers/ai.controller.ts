import type { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { ApiError } from '../utils/ApiError';
import { AI_LIMITS, AI_PROMPTS } from '../utils/ai-prompts';
import {
  callOpenRouter,
  ChatMessage,
  clip,
  isAiEnabled,
} from '../utils/openrouter';

function buildChatPayload(
  messages: Array<{ role: 'user' | 'model'; content: string }>,
): ChatMessage[] {
  let totalChars = 0;
  const out: ChatMessage[] = [{ role: 'system', content: AI_PROMPTS.chatSystem }];
  for (const m of messages) {
    const role: ChatMessage['role'] = m.role === 'model' ? 'assistant' : 'user';
    const content = clip(m.content, AI_LIMITS.chatTotalMaxChars - totalChars);
    if (!content) break;
    totalChars += content.length;
    out.push({ role, content });
    if (totalChars >= AI_LIMITS.chatTotalMaxChars) break;
  }
  return out;
}

export async function summarize(req: Request, res: Response): Promise<void> {
  const { articleId } = req.body as { articleId: string; refresh?: boolean };

  const article = await prisma.article.findUnique({ where: { id: articleId } });
  if (!article) throw ApiError.notFound('Article not found');

  const trimmedContent = clip(article.content, AI_LIMITS.contentMaxChars);

  let summary: string;
  if (!isAiEnabled) {
    
    const sentences = trimmedContent
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?])\s+/)
      .slice(0, 4)
      .map((s) => `• ${s.trim()}`)
      .join('\n');
    summary = sentences || 'Summary unavailable.';
  } else {
    try {
      summary = await callOpenRouter(
        [
          { role: 'system', content: 'You write clear, concise study summaries.' },
          { role: 'user', content: AI_PROMPTS.summarize(trimmedContent, 120) },
        ],
        { temperature: 0.4, maxTokens: 400 },
      );
      if (!summary) summary = 'Summary unavailable.';
    } catch (err) {
      logger.error({ err }, 'AI summarize failed');
      summary = 'Summary is currently unavailable. Please try again shortly.';
    }
  }

  res.json({ ok: true, data: { summary, cached: false } });
}

export async function hint(req: Request, res: Response): Promise<void> {
  const { articleId, questionId, draft } = req.body as {
    articleId: string;
    questionId: string;
    draft?: string;
  };

  const assignment = await prisma.assignment.findUnique({ where: { articleId } });
  if (!assignment) throw ApiError.notFound('Assignment not found');

  const question = assignment.questions.find((q) => q.id === questionId);
  if (!question) throw ApiError.notFound('Question not found');

  
  
  const internalRef =
    question.modelAnswer ??
    (question.correctIndex != null ? question.options[question.correctIndex] : undefined);

  if (!isAiEnabled) {
    res.json({
      ok: true,
      data: {
        hint:
          'Re-read the relevant section of the article and focus on the keyword(s) in the question. Try rephrasing your answer in your own words.',
      },
    });
    return;
  }

  let text: string;
  try {
    text = await callOpenRouter(
      [
        { role: 'system', content: 'You are a Socratic tutor who never reveals the answer.' },
        {
          role: 'user',
          content: AI_PROMPTS.hint({
            question: clip(question.prompt, AI_LIMITS.contentMaxChars),
            rubricOrCorrect: internalRef ? clip(internalRef, AI_LIMITS.contentMaxChars) : undefined,
            userDraft: draft ? clip(draft, AI_LIMITS.hintDraftMaxChars) : undefined,
          }),
        },
      ],
      { temperature: 0.7, maxTokens: 200 },
    );
    if (!text) text = 'Try breaking the question into smaller parts.';
  } catch (err) {
    logger.error({ err }, 'AI hint failed');
    text = 'Hint unavailable right now. Try outlining the key concept in your own words.';
  }

  res.json({ ok: true, data: { hint: text } });
}

export async function chat(req: Request, res: Response): Promise<void> {
  const { messages } = req.body as {
    messages: Array<{ role: 'user' | 'model'; content: string }>;
  };

  if (!isAiEnabled) {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    res.json({
      ok: true,
      data: { reply: `(AI is offline in this environment.) Stub reply to: "${lastUser.slice(0, 80)}…"` },
    });
    return;
  }

  let reply: string;
  try {
    reply = await callOpenRouter(buildChatPayload(messages), { temperature: 0.7, maxTokens: 800 });
    if (!reply) reply = 'I was unable to generate a response.';
  } catch (err) {
    logger.error({ err }, 'AI chat failed');
    reply = 'The AI assistant is temporarily unavailable. Please try again shortly.';
  }
  res.json({ ok: true, data: { reply } });
}
