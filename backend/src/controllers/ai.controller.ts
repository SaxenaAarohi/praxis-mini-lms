import type { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import * as aiService from '../services/ai.service';
import { ApiError } from '../utils/ApiError';

export async function summarize(req: Request, res: Response): Promise<void> {
  const { articleId, refresh } = req.body as { articleId: string; refresh?: boolean };
  const article = await prisma.article.findUnique({ where: { id: articleId } });
  if (!article) throw ApiError.notFound('Article not found');

  if (article.summary && !refresh) {
    res.json({ ok: true, data: { summary: article.summary, cached: true } });
    return;
  }

  const summary = await aiService.summarizeArticle(article.content);
  await prisma.article.update({ where: { id: article.id }, data: { summary } });
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
    (question.correctIndex != null && question.options[question.correctIndex]) ??
    undefined;

  const text = await aiService.generateHint({
    question: question.prompt,
    rubricOrCorrect: typeof internalRef === 'string' ? internalRef : undefined,
    userDraft: draft,
  });
  res.json({ ok: true, data: { hint: text } });
}

export async function chat(req: Request, res: Response): Promise<void> {
  const { messages } = req.body as {
    messages: Array<{ role: 'user' | 'model'; content: string }>;
  };
  const reply = await aiService.chat(messages);
  res.json({ ok: true, data: { reply } });
}

/**
 * Server-Sent Events stream of chat tokens. Each event is
 *   `data: {"delta": "<token>"}\n\n`
 * with a final `data: [DONE]\n\n` sentinel. Errors emit
 *   `data: {"error": "<message>"}\n\n`.
 */
export async function chatStream(req: Request, res: Response): Promise<void> {
  const { messages } = req.body as {
    messages: Array<{ role: 'user' | 'model'; content: string }>;
  };

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  // Disable proxy buffering (Render/nginx) so chunks reach the client immediately.
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Initial comment flushes headers and lets the client know the stream is open.
  res.write(': stream open\n\n');

  let aborted = false;
  req.on('close', () => {
    aborted = true;
  });

  try {
    for await (const delta of aiService.chatStream(messages)) {
      if (aborted) break;
      res.write(`data: ${JSON.stringify({ delta })}\n\n`);
    }
    if (!aborted) res.write('data: [DONE]\n\n');
  } catch (err) {
    logger.error({ err }, 'chatStream controller failed');
    if (!aborted) {
      res.write(`data: ${JSON.stringify({ error: 'stream failed' })}\n\n`);
    }
  } finally {
    res.end();
  }
}
