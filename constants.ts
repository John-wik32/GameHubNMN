
import { Difficulty, Course, Project, CompanyProject } from './types';

export const COURSES: Course[] = [
  {
    id: 'web-foundations',
    title: 'Modern Web Foundations',
    description: 'The bedrock of the internet: HTML5, CSS3, and Semantic Layouts.',
    language: 'HTML/CSS',
    category: 'Web',
    thumbnail: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=800&auto=format&fit=crop',
    estimatedTime: '12h',
    xpValue: 1500,
    skillsGained: ['Semantic HTML', 'Flexbox', 'CSS Grid', 'Responsive Design'],
    prerequisites: ['None'],
    level: Difficulty.BEGINNER,
    levels: [
      {
        level: Difficulty.BEGINNER,
        unlocked: true,
        lessons: [
          {
            id: 'html-l1',
            title: 'The Skeleton of the Web',
            type: 'code',
            overview: 'Understand the basic tags that build every webpage.',
            whyItMatters: 'HTML provides the meaning and structure to your content.',
            duration: '15m',
            starterCode: '<!-- Build your first heading here -->\n',
            sections: [
              {
                type: 'concept',
                title: 'Tags and Elements',
                content: 'Everything in HTML is wrapped in tags. Like <h1>This is a heading</h1>.',
                task: {
                  instruction: 'Create an <h1> tag with the text "Hello World".',
                  hint: 'Tags start with < and end with >. Use <h1> and </h1>.',
                  validationRules: [
                    { type: 'contains', target: '<h1>Hello World</h1>', errorMessage: 'Make sure you have an <h1> tag exactly matching "Hello World".' }
                  ]
                }
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'python-ds',
    title: 'Python for Data Science',
    description: 'Learn Python from scratch with a focus on data manipulation and logic.',
    language: 'Python',
    category: 'Data Science',
    thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=800&auto=format&fit=crop',
    estimatedTime: '18h',
    xpValue: 2000,
    skillsGained: ['Python Syntax', 'Lists & Dictionaries', 'Pandas', 'Matplotlib'],
    prerequisites: ['Logic Basics'],
    level: Difficulty.BEGINNER,
    levels: [
      {
        level: Difficulty.BEGINNER,
        unlocked: true,
        lessons: [
          {
            id: 'py-l1',
            title: 'Variables and Types',
            type: 'code',
            overview: 'Store and manipulate data using variables.',
            whyItMatters: 'Variables are the containers for data in every program.',
            duration: '10m',
            starterCode: '# Create a variable named "age"\n',
            sections: [
              {
                type: 'concept',
                title: 'Assignment',
                content: 'In Python, we use the = sign to assign a value to a name.',
                task: {
                  instruction: 'Assign the number 25 to a variable named "age".',
                  hint: 'Use age = 25',
                  validationRules: [
                    { type: 'contains', target: 'age = 25', errorMessage: 'Did you assign 25 to age?' }
                  ]
                }
              }
            ]
          }
        ]
      }
    ]
  }
];

export const PROJECTS: Project[] = [
  {
    id: 'p-portfolio',
    title: 'Developer Portfolio',
    description: 'Build and deploy a professional portfolio site from scratch.',
    thumbnail: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?q=80&w=800&auto=format&fit=crop',
    techStack: ['HTML', 'CSS'],
    difficulty: Difficulty.BEGINNER,
    category: 'Web',
    steps: [
      {
        id: 's1',
        title: 'Structure',
        description: 'Define the semantic structure of your site.',
        task: 'Add a <header>, <main>, and <footer> to the index.html file.',
        files: [
          { id: 'index', name: 'index.html', language: 'html', content: '<!DOCTYPE html>\n<html>\n<body>\n</body>\n</html>' }
        ],
        validationRules: [
          { type: 'contains', target: '<header>', errorMessage: 'Missing <header> tag.' },
          { type: 'contains', target: '<footer>', errorMessage: 'Missing <footer> tag.' }
        ]
      }
    ]
  }
];

// Added COMPANY_PROJECTS constant
export const COMPANY_PROJECTS: CompanyProject[] = [
  {
    id: 'aurapay-v1',
    companyName: 'AuraPay',
    projectName: 'Internal Ledger',
    description: 'Mission-critical transaction ledger requiring absolute data integrity and high-performance throughput.',
    techStack: ['TypeScript', 'PostgreSQL', 'Redis'],
    backlog: [
      {
        id: '1',
        title: 'Fix Ledger Drift',
        description: 'Occasional penny differences in reconciliation due to floating point math in old microservice.',
        type: 'bug'
      },
      {
        id: '2',
        title: 'Implement Idempotency Keys',
        description: 'Add support for client-provided idempotency keys to prevent duplicate transactions.',
        type: 'feature'
      }
    ],
    baseCodebase: [
      { id: 'l1', name: 'ledger.ts', language: 'typescript', content: 'export class Ledger { constructor() {} }' },
      { id: 'l2', name: 'utils.ts', language: 'typescript', content: '// Utility functions', isLocked: true }
    ]
  }
];
