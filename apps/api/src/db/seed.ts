import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from './client';

export async function seedDatabase() {
  console.log('🌱 Starting database seeding...');
  await db.init();

  // Clear existing data in correct foreign key order
  await db.query('DELETE FROM audit_logs');
  await db.query('DELETE FROM attempt_answers');
  await db.query('DELETE FROM attempts');
  await db.query('DELETE FROM question_versions');
  await db.query('DELETE FROM question_options');
  await db.query('DELETE FROM questions');
  await db.query('DELETE FROM quizzes');
  await db.query('DELETE FROM categories');
  await db.query('DELETE FROM users');
  await db.query('DELETE FROM pdf_jobs');

  // 1. Seed Users
  const salt = await bcrypt.genSalt(10);
  const adminHash = await bcrypt.hash('Admin@123', salt);
  const learnerHash = await bcrypt.hash('Learner@123', salt);

  const adminId = uuidv4();
  const learner1Id = uuidv4();
  const learner2Id = uuidv4();

  await db.query(
    `INSERT INTO users (id, name, email, password_hash, role) VALUES
     ($1, 'System Administrator', 'admin@quizforge.com', $2, 'admin'),
     ($3, 'John Doe', 'john@quizforge.com', $4, 'learner'),
     ($5, 'Sarah Connor', 'sarah@quizforge.com', $4, 'learner')`,
    [adminId, adminHash, learner1Id, learnerHash, learner2Id]
  );
  console.log('  Users seeded: Admin and 2 Learners');

  // 2. Seed Categories
  const catJavaId = uuidv4();
  const catWebId = uuidv4();
  const catDbId = uuidv4();
  const catQaId = uuidv4();

  await db.query(
    `INSERT INTO categories (id, name, slug, description) VALUES
     ($1, 'Java & Object Oriented Programming', 'java-oop', 'Core Java, OOP principles, collections and JVM internals'),
     ($2, 'Web Development & JavaScript', 'web-development', 'Modern JavaScript, DOM, asynchronous programming and React'),
     ($3, 'SQL & Database Architecture', 'database-systems', 'Relational database design, SQL queries, indexing and normalization'),
     ($4, 'Quality Assurance & Testing', 'qa-testing', 'Automated testing, unit tests, Selenium and Playwright')`,
    [catJavaId, catWebId, catDbId, catQaId]
  );
  console.log('  Categories seeded');

  // Helper to create a complete question with 4 options
  async function insertQuestion(params: {
    quizId: string;
    text: string;
    options: { letter: string; text: string }[];
    correctLetter: string;
    explanation?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    categoryId?: string;
    requiresReview?: boolean;
  }) {
    const qId = uuidv4();
    const isReview = !!params.requiresReview;

    await db.query(
      `INSERT INTO questions (id, quiz_id, question_text, explanation, difficulty, category_id, detection_method, confidence, requires_review)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        qId,
        params.quizId,
        params.text,
        params.explanation || null,
        params.difficulty || 'medium',
        params.categoryId || null,
        isReview ? 'manual_required' : 'answer_key',
        isReview ? 0.0 : 1.0,
        isReview
      ]
    );

    let correctOptId: string | null = null;
    const optionIds: { letter: string; id: string }[] = [];

    for (let i = 0; i < params.options.length; i++) {
      const opt = params.options[i];
      const optId = uuidv4();
      const isCorrect = !isReview && opt.letter.toUpperCase() === params.correctLetter.toUpperCase();
      if (isCorrect) correctOptId = optId;

      await db.query(
        `INSERT INTO question_options (id, question_id, option_letter, text, is_correct, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [optId, qId, opt.letter.toUpperCase(), opt.text, isCorrect, i]
      );

      optionIds.push({ letter: opt.letter.toUpperCase(), id: optId });
    }

    if (correctOptId) {
      await db.query(`UPDATE questions SET correct_option_id = $1 WHERE id = $2`, [
        correctOptId,
        qId
      ]);
    }

    return { questionId: qId, correctOptionId: correctOptId, optionIds };
  }

  // 3. Seed Quiz 1: Java Core & OOP Fundamentals (Published)
  const quiz1Id = uuidv4();
  await db.query(
    `INSERT INTO quizzes (
      id, title, description, category_id, difficulty, status,
      time_limit_minutes, passing_percentage, attempts_allowed,
      randomize_questions, randomize_options, show_results_immediately,
      show_correct_answers, show_explanations, allow_review, allow_retake,
      review_mode, created_by
    ) VALUES (
      $1, 'Java Core & OOP Fundamentals',
      'Master the core building blocks of Java: Polymorphism, Inheritance, Encapsulation, JVM memory architecture, and Collections.',
      $2, 'medium', 'published', 15, 70, 0, false, false, true, true, true, true, true, 'full_review', $3
    )`,
    [quiz1Id, catJavaId, adminId]
  );

  const q1Data = await insertQuestion({
    quizId: quiz1Id,
    categoryId: catJavaId,
    difficulty: 'easy',
    text: 'What is Java?',
    options: [
      { letter: 'A', text: 'A relational database management system' },
      { letter: 'B', text: 'A high-level, class-based, object-oriented programming language' },
      { letter: 'C', text: 'An operating system kernel' },
      { letter: 'D', text: 'A web browser rendering engine' }
    ],
    correctLetter: 'B',
    explanation: 'Java is an object-oriented, class-based programming language developed by Sun Microsystems in 1995.'
  });

  const q2Data = await insertQuestion({
    quizId: quiz1Id,
    categoryId: catJavaId,
    difficulty: 'easy',
    text: 'Which keyword is used in Java to inherit a class?',
    options: [
      { letter: 'A', text: 'implements' },
      { letter: 'B', text: 'extends' },
      { letter: 'C', text: 'inherits' },
      { letter: 'D', text: 'super' }
    ],
    correctLetter: 'B',
    explanation: 'The "extends" keyword is used to inherit superclass attributes and methods in Java. "implements" is used for interfaces.'
  });

  const q3Data = await insertQuestion({
    quizId: quiz1Id,
    categoryId: catJavaId,
    difficulty: 'medium',
    text: 'Which of the following is NOT an access modifier in Java?',
    options: [
      { letter: 'A', text: 'private' },
      { letter: 'B', text: 'protected' },
      { letter: 'C', text: 'internal' },
      { letter: 'D', text: 'public' }
    ],
    correctLetter: 'C',
    explanation: '"internal" is an access modifier in C# and Kotlin, but not in Java. Java supports private, default (package-private), protected, and public.'
  });

  await insertQuestion({
    quizId: quiz1Id,
    categoryId: catJavaId,
    difficulty: 'medium',
    text: 'Where are object instances stored in Java memory?',
    options: [
      { letter: 'A', text: 'Call Stack' },
      { letter: 'B', text: 'Heap Memory' },
      { letter: 'C', text: 'Method Area' },
      { letter: 'D', text: 'CPU Registers' }
    ],
    correctLetter: 'B',
    explanation: 'All object instances in Java are dynamically allocated on the Heap. References to those objects are stored on the Stack.'
  });

  await insertQuestion({
    quizId: quiz1Id,
    categoryId: catJavaId,
    difficulty: 'medium',
    text: 'Which interface must a class implement to allow its objects to be sorted using Collections.sort()?',
    options: [
      { letter: 'A', text: 'Serializable' },
      { letter: 'B', text: 'Cloneable' },
      { letter: 'C', text: 'Comparable' },
      { letter: 'D', text: 'Iterable' }
    ],
    correctLetter: 'C',
    explanation: 'Implementing Comparable<T> requires defining the compareTo() method, which provides natural ordering for Collections.sort().'
  });

  await insertQuestion({
    quizId: quiz1Id,
    categoryId: catJavaId,
    difficulty: 'hard',
    text: 'What happens when a finally block contains a return statement in Java?',
    options: [
      { letter: 'A', text: 'It causes a compilation error' },
      { letter: 'B', text: 'It overrides any return statement in the try or catch block' },
      { letter: 'C', text: 'It is ignored if the try block already returned' },
      { letter: 'D', text: 'It throws a RuntimeException' }
    ],
    correctLetter: 'B',
    explanation: 'A return statement inside a finally block will discard any exception or return value produced in the corresponding try or catch block.'
  });

  await insertQuestion({
    quizId: quiz1Id,
    categoryId: catJavaId,
    difficulty: 'medium',
    text: 'What is the default initial capacity of an ArrayList in Java 8 and above?',
    options: [
      { letter: 'A', text: '0 upon creation, 10 upon first element addition' },
      { letter: 'B', text: '16' },
      { letter: 'C', text: '32' },
      { letter: 'D', text: '10 immediately allocated' }
    ],
    correctLetter: 'A',
    explanation: 'Java initializes ArrayList with an empty array. On adding the first element, it lazily expands capacity to 10.'
  });

  await insertQuestion({
    quizId: quiz1Id,
    categoryId: catJavaId,
    difficulty: 'easy',
    text: 'Which concept of OOP is achieved through method overloading in Java?',
    options: [
      { letter: 'A', text: 'Compile-time Polymorphism (Static Binding)' },
      { letter: 'B', text: 'Runtime Polymorphism (Dynamic Binding)' },
      { letter: 'C', text: 'Encapsulation' },
      { letter: 'D', text: 'Data Abstraction' }
    ],
    correctLetter: 'A',
    explanation: 'Method overloading resolves methods at compile time based on method signatures, representing compile-time polymorphism.'
  });

  await insertQuestion({
    quizId: quiz1Id,
    categoryId: catJavaId,
    difficulty: 'hard',
    text: 'Which Garbage Collection algorithm was made the default in Java 9?',
    options: [
      { letter: 'A', text: 'Serial GC' },
      { letter: 'B', text: 'Parallel GC' },
      { letter: 'C', text: 'G1 (Garbage-First) GC' },
      { letter: 'D', text: 'ZGC' }
    ],
    correctLetter: 'C',
    explanation: 'G1 GC replaced the throughput-oriented Parallel GC as the default garbage collector starting in Java 9.'
  });

  await insertQuestion({
    quizId: quiz1Id,
    categoryId: catJavaId,
    difficulty: 'medium',
    text: 'What is the purpose of the transient keyword in Java?',
    options: [
      { letter: 'A', text: 'To mark a variable as thread-safe' },
      { letter: 'B', text: 'To prevent a member variable from being serialized' },
      { letter: 'C', text: 'To make a variable immutable' },
      { letter: 'D', text: 'To allow a variable to be accessed across packages' }
    ],
    correctLetter: 'B',
    explanation: 'Fields marked as transient are skipped by the Java serialization process and their values are not written to the byte stream.'
  });
  console.log('  Quiz 1 (Java) seeded with 10 questions');

  // 4. Seed Quiz 2: Web Development & JavaScript Essentials (Published)
  const quiz2Id = uuidv4();
  await db.query(
    `INSERT INTO quizzes (
      id, title, description, category_id, difficulty, status,
      time_limit_minutes, passing_percentage, attempts_allowed,
      randomize_questions, randomize_options, show_results_immediately,
      show_correct_answers, show_explanations, allow_review, allow_retake,
      review_mode, created_by
    ) VALUES (
      $1, 'Web Development & JavaScript Essentials',
      'Test your understanding of JavaScript closures, Event Loop, Promises, DOM manipulation, and modern ES6+ features.',
      $2, 'easy', 'published', 10, 60, 0, false, false, true, true, true, true, true, 'full_review', $3
    )`,
    [quiz2Id, catWebId, adminId]
  );

  await insertQuestion({
    quizId: quiz2Id,
    categoryId: catWebId,
    difficulty: 'easy',
    text: 'Which operator is used for strict equality in JavaScript?',
    options: [
      { letter: 'A', text: '==' },
      { letter: 'B', text: '===' },
      { letter: 'C', text: '=' },
      { letter: 'D', text: '<=>' }
    ],
    correctLetter: 'B',
    explanation: 'The === operator tests for strict equality without type coercion.'
  });

  await insertQuestion({
    quizId: quiz2Id,
    categoryId: catWebId,
    difficulty: 'medium',
    text: 'What is a JavaScript closure?',
    options: [
      { letter: 'A', text: 'A syntax construct used to close HTML tags' },
      { letter: 'B', text: 'A combination of a function bundled together with references to its surrounding lexical environment' },
      { letter: 'C', text: 'A method to terminate browser workers' },
      { letter: 'D', text: 'An encrypted token transmitted via HTTPS' }
    ],
    correctLetter: 'B',
    explanation: 'A closure gives a function access to its outer scope from an inner function even after the outer function has executed.'
  });

  await insertQuestion({
    quizId: quiz2Id,
    categoryId: catWebId,
    difficulty: 'medium',
    text: 'What will typeof null return in standard JavaScript?',
    options: [
      { letter: 'A', text: '"null"' },
      { letter: 'B', text: '"undefined"' },
      { letter: 'C', text: '"object"' },
      { letter: 'D', text: '"boolean"' }
    ],
    correctLetter: 'C',
    explanation: 'typeof null returning "object" is a historic quirk of JavaScript from its initial implementation in 1995.'
  });

  await insertQuestion({
    quizId: quiz2Id,
    categoryId: catWebId,
    difficulty: 'medium',
    text: 'Which Promise method resolves when ANY of the given promises resolves?',
    options: [
      { letter: 'A', text: 'Promise.all()' },
      { letter: 'B', text: 'Promise.allSettled()' },
      { letter: 'C', text: 'Promise.race()' },
      { letter: 'D', text: 'Promise.any()' }
    ],
    correctLetter: 'D',
    explanation: 'Promise.any() fulfills as soon as any of the promises fulfill. If all reject, it rejects with an AggregateError.'
  });

  console.log('  Quiz 2 (Web Dev) seeded');

  // 5. Seed Quiz 3: SQL & Database Systems (Draft with 1 review required question)
  const quiz3Id = uuidv4();
  await db.query(
    `INSERT INTO quizzes (
      id, title, description, category_id, difficulty, status,
      time_limit_minutes, passing_percentage, attempts_allowed,
      randomize_questions, randomize_options, show_results_immediately,
      show_correct_answers, show_explanations, allow_review, allow_retake,
      review_mode, created_by
    ) VALUES (
      $1, 'SQL & Relational Database Design',
      'Covers ACID transactions, query optimization, foreign keys, and relational normalization forms.',
      $2, 'hard', 'draft', 20, 75, 0, false, false, true, true, true, true, true, 'full_review', $3
    )`,
    [quiz3Id, catDbId, adminId]
  );

  await insertQuestion({
    quizId: quiz3Id,
    categoryId: catDbId,
    difficulty: 'easy',
    text: 'Which SQL clause is used to filter rows returned by a GROUP BY clause?',
    options: [
      { letter: 'A', text: 'WHERE' },
      { letter: 'B', text: 'HAVING' },
      { letter: 'C', text: 'ORDER BY' },
      { letter: 'D', text: 'LIMIT' }
    ],
    correctLetter: 'B',
    explanation: 'The HAVING clause was added to SQL because the WHERE keyword cannot be used with aggregate functions.'
  });

  // Review-required question (demonstrates verification required warning)
  await insertQuestion({
    quizId: quiz3Id,
    categoryId: catDbId,
    difficulty: 'hard',
    text: 'Which normal form eliminates transitive dependency of non-prime attributes on superkeys?',
    options: [
      { letter: 'A', text: 'First Normal Form (1NF)' },
      { letter: 'B', text: 'Second Normal Form (2NF)' },
      { letter: 'C', text: 'Third Normal Form (3NF)' },
      { letter: 'D', text: 'Boyce-Codd Normal Form (BCNF)' }
    ],
    correctLetter: 'C',
    requiresReview: true,
    explanation: 'A relation is in 3NF if it is in 2NF and there is no transitive dependency for non-prime attributes.'
  });

  console.log('  Quiz 3 (Database - Draft) seeded');

  // 6. Seed Attempts for Learner 1 (John) on Quiz 1
  const attempt1Id = uuidv4();
  const attemptStarted = new Date(Date.now() - 3600 * 1000); // 1 hour ago
  const attemptSubmitted = new Date(Date.now() - 3600 * 1000 + 450 * 1000); // 7.5 mins later

  await db.query(
    `INSERT INTO attempts (
      id, user_id, quiz_id, started_at, submitted_at, time_taken_seconds,
      score, max_score, percentage, is_passed, status
    ) VALUES ($1, $2, $3, $4, $5, 450, 8, 10, 80.0, true, 'submitted')`,
    [attempt1Id, learner1Id, quiz1Id, attemptStarted.toISOString(), attemptSubmitted.toISOString()]
  );

  // Record answers for attempt 1
  await db.query(
    `INSERT INTO attempt_answers (id, attempt_id, question_id, selected_option_id, is_correct, answered_at)
     VALUES 
      ($1, $2, $3, $4, true, $5),
      ($6, $2, $7, $8, true, $5)`,
    [
      uuidv4(),
      attempt1Id,
      q1Data.questionId,
      q1Data.correctOptionId,
      attemptSubmitted.toISOString(),
      uuidv4(),
      q2Data.questionId,
      q2Data.correctOptionId
    ]
  );

  // 7. Seed Audit Logs
  await db.query(
    `INSERT INTO audit_logs (id, user_id, user_name, user_email, action, entity, entity_id, metadata_json) VALUES
     ($1, $2, 'System Administrator', 'admin@quizforge.com', 'SYSTEM_INITIALIZED', 'system', NULL, '{"version":"1.0.0"}'::jsonb),
     ($3, $2, 'System Administrator', 'admin@quizforge.com', 'QUIZ_PUBLISHED', 'quiz', $4, '{"title":"Java Core & OOP Fundamentals"}'::jsonb),
     ($5, $6, 'John Doe', 'john@quizforge.com', 'QUIZ_ATTEMPT_SUBMITTED', 'attempt', $7, '{"score":8,"percentage":80,"isPassed":true}'::jsonb)`,
    [uuidv4(), adminId, uuidv4(), quiz1Id, uuidv4(), learner1Id, attempt1Id]
  );

  console.log('✅ Database seeded successfully with production demo data!');
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding error:', err);
      process.exit(1);
    });
}
