import { SERVICES } from '../config/services.js';
import { hashPassword } from '../utils/passwords.js';

// All demo people, contact details and requirements are illustrative, not real customers.
export async function seedDemo(store) {
  if (!store.data || store.data.users.length) return;
  const ago = (days, hours = 0) => new Date(Date.now() - days * 86400000 - hours * 3600000);
  // The public demo exposes only student access. Admin fixtures are test-only.
  const passwordHash = await hashPassword('DemoPassword123!');
  if (process.env.NODE_ENV === 'test') {
    await store.users.create({
      username: 'admin_demo',
      usernameNormalized: 'admin_demo',
      passwordHash,
      fullName: 'ErasePaper Admin',
      phoneNumber: '+919000000001',
      email: 'admin@example.com',
      emailNormalized: 'admin@example.com',
      role: 'admin',
      createdAt: ago(120),
    });
  }
  const names = [
    'Aarav Sharma',
    'Priya Patel',
    'Rohan Mehta',
    'Ananya Desai',
    'Arjun Nair',
    'Sneha Joshi',
    'Vivaan Shah',
    'Ishita Rao',
    'Aditya Verma',
    'Diya Menon',
    'Karan Singh',
    'Meera Iyer',
    'Dhruv Bhatt',
    'Kavya Reddy',
    'Nikhil Gupta',
    'Riya Kapoor',
    'Siddharth Jain',
    'Tanvi Kulkarni',
    'Yash Trivedi',
    'Pooja Nambiar',
    'Dev Malhotra',
    'Aditi Chandra',
    'Harsh Solanki',
    'Nisha Pillai',
  ];
  const students = [];
  for (let i = 0; i < names.length; i++) {
    const username = i === 0 ? 'student_demo' : `student_${i + 1}`;
    const email = `${names[i].toLowerCase().replace(' ', '.')}@example.com`;
    const student = await store.users.create({
      username,
      usernameNormalized: username,
      passwordHash,
      fullName: names[i],
      phoneNumber: `+910000000${String(101 + i)}`,
      email,
      emailNormalized: email.toLowerCase(),
      createdAt: ago(i === 0 ? 32 : 25 - i, i),
      lastLoginAt: ago(i % 5, i),
    });
    students.push(student);
  }
  const topics = [
    [
      'literature-review',
      'Literature review guidance — sustainable construction',
      'Help me organise peer-reviewed sources and develop a review structure for my research on sustainable construction materials.',
      {
        researchArea: 'Sustainable construction materials',
        academicLevel: 'Postgraduate',
        citationStyle: 'APA 7',
      },
    ],
    [
      'research-paper',
      'Research methodology and editing support',
      'I have a working draft and would like feedback on the methodology, academic language, structure and reference formatting.',
      { researchArea: 'Renewable energy systems', researchStage: 'Draft ready', publicationTarget: '' },
    ],
    [
      'survey-paper',
      'Comparative survey of machine learning methods',
      'I need guidance comparing recent methods, organising the literature and identifying open research gaps for my survey.',
      {
        researchArea: 'Machine learning in healthcare',
        surveyScope: '2022–2026',
        comparisonCriteria: 'Accuracy, datasets, interpretability',
      },
    ],
    [
      'bulk-printing',
      'Semester 6 laboratory manuals — 30 copies',
      'Please quote for printing and spiral binding our laboratory manuals. We also need help arranging the manual documents.',
      {
        documentType: 'Laboratory manual',
        copies: 30,
        pageCount: 84,
        printType: 'Black & white',
        binding: 'Spiral',
        deliveryAddress: 'College department office, Ahmedabad, Gujarat 380015',
      },
    ],
    [
      'final-year-project',
      'IoT-based smart irrigation — project mentoring',
      'I am building a smart irrigation prototype and need mentoring on implementation, report documentation and presentation preparation.',
      {
        branch: 'Computer Engineering',
        college: 'Gujarat Technological University',
        technology: 'IoT, MERN stack',
        projectStage: 'Implementation',
      },
    ],
  ];
  for (let i = 0; i < 48; i++) {
    const [serviceSlug, title, description, details] = topics[i % 5];
    const service = SERVICES.find((s) => s.slug === serviceSlug);
    const student = students[i < 5 ? 0 : (i - 5) % students.length];
    const status = i < 9 ? 'Pending' : i < 23 ? 'In Progress' : i < 44 ? 'Completed' : 'Cancelled';
    const request = await store.requests.create({
      userId: student._id,
      serviceSlug,
      serviceType: service.name,
      title: i < 5 ? title : `${title}${i > 23 ? ` — cohort ${Math.floor(i / 5) + 1}` : ''}`,
      description,
      additionalInfo: i % 3 === 0 ? 'Please contact me on WhatsApp to discuss the next steps.' : '',
      details: { ...details, deadline: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10) },
      status,
      adminNotes:
        status === 'Completed'
          ? 'Guidance shared. Follow-up questions addressed.'
          : status === 'In Progress'
            ? 'Requirements reviewed. Awaiting student availability.'
            : '',
      createdAt: ago(i < 5 ? i : Math.floor(i * 2.7), i % 8),
      integrityAcknowledgedAt: ago(i),
    });
    if (i < 6)
      await store.notifications.create({
        type: 'request',
        title: 'New service request',
        message: `${service.shortName} · ${request.requestId}`,
        relatedRequestId: String(request._id),
        relatedUserId: String(student._id),
        createdAt: request.createdAt,
        readAt: i > 2 ? ago(0) : null,
      });
  }
  for (const student of students.slice(-5))
    await store.notifications.create({
      type: 'registration',
      title: 'A new student joined',
      message: 'A student account was created and is ready to explore.',
      relatedUserId: String(student._id),
      createdAt: student.createdAt,
      readAt: ago(0),
    });
  await store.logs.create({
    actorId: 'system',
    action: 'demo.initialized',
    targetId: 'demo',
    metadata: { illustrative: true },
    createdAt: ago(0),
  });
  await store.logs.create({
    actorId: 'demo_admin',
    action: 'request.status_updated',
    targetId: 'illustrative-request',
    metadata: { status: 'Completed' },
    createdAt: ago(1),
  });
}
