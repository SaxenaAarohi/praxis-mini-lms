
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { PrismaClient, QuestionType, Role } from '@prisma/client';

const prisma = new PrismaClient();

const ARTICLES: Array<{
  title: string;
  slug: string;
  tags: string[];
  content: string;
  summary: string;
  questions: Array<
    | { type: 'MCQ'; prompt: string; options: string[]; correctIndex: number; points: number }
    | { type: 'SHORT'; prompt: string; modelAnswer: string; rubric?: string; points: number }
  >;
}> = [
  {
    title: 'Closures in JavaScript: A Practical Guide',
    slug: 'closures-in-javascript',
    tags: ['javascript', 'fundamentals'],
    summary:
      'Closures are functions that remember the environment in which they were created. They power encapsulation, factories, and event handlers in JavaScript.',
    content: `# Closures in JavaScript

A **closure** is the combination of a function bundled together with references to its surrounding state — its lexical environment. Closures are created every time a function is created in JavaScript.

## Why closures matter

\`\`\`js
function makeCounter() {
  let count = 0;
  return () => ++count;
}
const next = makeCounter();
next(); // 1
next(); // 2
\`\`\`

The inner arrow function "closes over" \`count\`. Each \`makeCounter\` call creates a fresh independent counter — perfect for encapsulating private state without classes.

## Common uses

- **Data privacy** — variables remain inaccessible from the outside.
- **Function factories** — pre-configure behavior (e.g., \`add(5)\` returning a function that adds 5).
- **Event handlers** — capture loop indices or component state.

## Common pitfalls

- Capturing variables in a \`var\` loop yields surprising results — prefer \`let\` for block scoping.
- Closures retain memory; avoid holding large objects unnecessarily.

Mastering closures unlocks a deeper understanding of how JavaScript handles scope and async callbacks.`,
    questions: [
      {
        type: 'MCQ',
        prompt: 'What does a closure capture?',
        options: [
          'Only the function arguments',
          'A reference to its surrounding lexical environment',
          'A snapshot of the global object',
          'Nothing — closures share state across all calls',
        ],
        correctIndex: 1,
        points: 10,
      },
      {
        type: 'MCQ',
        prompt: 'Which loop construct most reliably preserves the per-iteration value inside a closure?',
        options: ['var i', 'let i', 'const i = 0', 'window.i'],
        correctIndex: 1,
        points: 10,
      },
      {
        type: 'SHORT',
        prompt:
          'In your own words, explain why a closure created inside a factory function can be used to encapsulate private state.',
        modelAnswer:
          'Each call to the factory creates a new lexical scope. The returned inner function retains a reference to that scope, so its variables persist between calls but are unreachable from outside the factory — giving you private mutable state per instance.',
        rubric:
          'Award full marks for mentioning fresh lexical scope per call AND inaccessibility from outside. Half marks for one of the two.',
        points: 20,
      },
    ],
  },
  {
    title: 'React Hooks: useEffect Demystified',
    slug: 'react-hooks-useeffect',
    tags: ['react', 'frontend', 'hooks'],
    summary:
      'useEffect synchronises React components with external systems — networks, subscriptions, browser APIs. Master the dependency array and cleanup function to write predictable effects.',
    content: `# React Hooks: useEffect Demystified

\`useEffect\` lets you run side effects after render. Think of it as **synchronisation**, not "did mount".

## Anatomy

\`\`\`jsx
useEffect(() => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
}, [tick]);
\`\`\`

- The function body runs after every commit by default.
- The optional **dependency array** controls re-runs.
- The return value is a **cleanup** function, run before the next effect or on unmount.

## Mental model

> Don't ask "when does this effect run?" Ask "what does this effect synchronise with?"

If your effect depends on \`userId\`, list it. React will re-synchronise whenever \`userId\` changes.

## Common mistakes

- **Missing deps** → stale closures.
- **Doing async work inside the callback directly** → wrap it in an inner function.
- **Forgetting cleanup** → leaks for subscriptions and timers.

Used carefully, \`useEffect\` becomes a clear contract between your component and the outside world.`,
    questions: [
      {
        type: 'MCQ',
        prompt: 'When does the cleanup function returned from useEffect run?',
        options: [
          'Only on unmount',
          'Before every re-render',
          'Before the next effect runs and on unmount',
          'After the component unmounts only if specified',
        ],
        correctIndex: 2,
        points: 10,
      },
      {
        type: 'MCQ',
        prompt: 'What problem does an empty dependency array `[]` create?',
        options: [
          'It runs the effect on every render',
          'It captures values from the first render only — risk of stale closures',
          'It disables the effect entirely',
          'It throws a warning in production',
        ],
        correctIndex: 1,
        points: 10,
      },
      {
        type: 'SHORT',
        prompt:
          'Why is "synchronisation" a more useful mental model for useEffect than "lifecycle"?',
        modelAnswer:
          'Effects describe what state outside the component should look like given the current props/state. Re-runs are how React keeps that external state in sync as inputs change — not arbitrary lifecycle hooks. Reasoning in terms of synchronisation makes dependencies and cleanup obvious.',
        rubric:
          'Look for the idea that effects describe *desired external state* and re-run to maintain consistency. Half marks if only mentions "side effects" without the sync framing.',
        points: 20,
      },
    ],
  },
  {
    title: 'MongoDB vs SQL: Modeling Document Relationships',
    slug: 'mongodb-vs-sql-relationships',
    tags: ['databases', 'mongodb', 'design'],
    summary:
      'MongoDB documents and SQL tables both model entities — but they differ on relationships. Embed when data is read together, reference when it lives separately.',
    content: `# MongoDB vs SQL: Modeling Relationships

In a relational database, you normalise: every entity gets a table, and joins reconstruct relationships. MongoDB takes a different stance: store data the way it is read.

## Embed when…

- The child data is **bounded** in size.
- It is **always** read with its parent.
- Updates to the child are infrequent.

\`\`\`js
{
  _id: ObjectId(),
  title: "Closures",
  assignment: { questions: [ ... ] }   // embedded
}
\`\`\`

## Reference when…

- The relationship is **many-to-many** or **unbounded**.
- The child is queried independently.
- You need atomic updates on the child.

\`\`\`js
// articles
{ _id, title, authorId }

// users
{ _id, name }
\`\`\`

## Aggregation > joins

MongoDB's aggregation pipeline lets you express \`$lookup\` (join), \`$unwind\` (flatten), \`$group\` (aggregate) — often in a single round trip. Use it for leaderboards, dashboards, and analytics.

The trade-off is intentional: schema design follows query patterns, not normal forms.`,
    questions: [
      {
        type: 'MCQ',
        prompt: 'When is embedding generally preferable to referencing?',
        options: [
          'When the child is shared across many parents',
          'When the child is unbounded in size',
          'When the child is bounded and always read with its parent',
          'When updates to the child happen constantly from many writers',
        ],
        correctIndex: 2,
        points: 10,
      },
      {
        type: 'MCQ',
        prompt: 'Which aggregation stage is closest to a SQL JOIN?',
        options: ['$match', '$group', '$lookup', '$unwind'],
        correctIndex: 2,
        points: 10,
      },
      {
        type: 'SHORT',
        prompt:
          'A leaderboard needs to show each user\'s average score across many assignments. Outline the aggregation stages you would use.',
        modelAnswer:
          'Group submissions by userId computing average percentage; lookup the user document for the display name; sort descending; limit to N. Optionally precede with a sort/group to deduplicate to the latest submission per (user, article).',
        rubric:
          'Look for $group by user, $avg of score, $lookup user, $sort, $limit. Half marks for partial pipeline. Bonus for deduplicating per article.',
        points: 20,
      },
    ],
  },
];

async function main() {
  console.log('🌱 Seeding mini-lms...');

  const adminPwd = await bcrypt.hash('Admin@123', 10);
  const userPwd = await bcrypt.hash('Student@123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@lms.dev' },
    update: { passwordHash: adminPwd, role: Role.ADMIN, name: 'LMS Admin' },
    create: {
      email: 'admin@lms.dev',
      name: 'LMS Admin',
      passwordHash: adminPwd,
      role: Role.ADMIN,
      gamification: { badges: [], streak: 0, lastActivityAt: null, totalPoints: 0 },
      readingProgress: [],
      stats: { assignmentsAttempted: 0, assignmentsPassed: 0, avgScore: 0 },
    },
  });

  const student = await prisma.user.upsert({
    where: { email: 'student@lms.dev' },
    update: { passwordHash: userPwd, role: Role.USER, name: 'Demo Student' },
    create: {
      email: 'student@lms.dev',
      name: 'Demo Student',
      passwordHash: userPwd,
      role: Role.USER,
      gamification: { badges: [], streak: 0, lastActivityAt: null, totalPoints: 0 },
      readingProgress: [],
      stats: { assignmentsAttempted: 0, assignmentsPassed: 0, avgScore: 0 },
    },
  });

  console.log(`  • admin: ${admin.email}`);
  console.log(`  • user : ${student.email}`);

  for (const a of ARTICLES) {
    const article = await prisma.article.upsert({
      where: { slug: a.slug },
      update: {
        title: a.title,
        content: a.content,
        summary: a.summary,
        tags: a.tags,
        published: true,
        authorId: admin.id,
        estimatedReadTime: Math.max(1, Math.ceil(a.content.split(/\s+/).length / 200)),
      },
      create: {
        title: a.title,
        slug: a.slug,
        content: a.content,
        summary: a.summary,
        tags: a.tags,
        published: true,
        authorId: admin.id,
        estimatedReadTime: Math.max(1, Math.ceil(a.content.split(/\s+/).length / 200)),
      },
    });

    const questions = a.questions.map((q, idx) => {
      const id = randomUUID();
      if (q.type === 'MCQ') {
        return {
          id,
          type: QuestionType.MCQ,
          prompt: q.prompt,
          points: q.points,
          order: idx,
          options: q.options,
          correctIndex: q.correctIndex,
          modelAnswer: null,
          rubric: null,
          maxWords: null,
        };
      }
      return {
        id,
        type: QuestionType.SHORT,
        prompt: q.prompt,
        points: q.points,
        order: idx,
        options: [],
        correctIndex: null,
        modelAnswer: q.modelAnswer,
        rubric: q.rubric ?? null,
        maxWords: 200,
      };
    });

    const existing = await prisma.assignment.findUnique({ where: { articleId: article.id } });
    if (existing) {
      await prisma.assignment.update({
        where: { id: existing.id },
        data: {
          title: `${a.title} – Practice`,
          passingScore: 60,
          questions: { set: questions },
        },
      });
    } else {
      await prisma.assignment.create({
        data: {
          articleId: article.id,
          title: `${a.title} – Practice`,
          passingScore: 60,
          questions: { set: questions },
        },
      });
    }

    console.log(`  ✓ ${a.title}`);
  }

  console.log('✅ Seed complete.');
  console.log('   Login as admin@lms.dev / Admin@123');
  console.log('   Login as student@lms.dev / Student@123');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
