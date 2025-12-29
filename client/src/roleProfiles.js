export const ROLE_PROFILES = {
  frontend: {
    title: "Frontend Developer",
    focus: ["React", "UI/UX", "Performance", "Accessibility"],
    questions: [
      {
        "id": "fe-1", 
        "text": "Tell me about a time you improved the performance of a web application."
      },
      {
        "id": "fe-2", 
        "text": "How do you approach debugging a complex UI issue?"
      },
      {
        "id": "fe-3", 
        "text": "Describe a component you designed that you're proud of."
      },
      {
        "id": "fe-4",
        "text": "Explain how React handles state updates."
      },
      {
        "id": "fe-5",
        "text": "What is the virtual DOM and why is it useful?"
      },
      {
        "id": "fe-6",
        "text": "How would you optimize a slow React application?"
      }
    ]
  },
  backend: {
    title: "Backend Developer",
    focus: ["APIs", "Databases", "Scalability"],
    questions: [
      {
        "id": "be-1",
        "text": "Describe a backend system you designed."
      },
      {
        "id": "be-2",
        "text": "How do you handle performance bottlenecks?"
      },
      {
        "id": "be-3",
        "text": "Explain a time you improved system reliability."
      },
      {
        "id": "be-4",
        "text": "Explain the difference between REST and GraphQL."
      },
      {
        "id": "be-5",
        "text": "How do you handle authentication in an API?"
      },
      {
        "id": "be-6",
        "text": "What are common backend performance bottlenecks?"
      }
    ]
  },
  security: {
    title: "Security Engineer",
    focus: ["Threat modeling", "Defense", "Incident response"],
    questions: [
      {
        "id": "sec-1",
        "text": "How do you approach securing an API?"
      },
      {
        "id": "sec-2",
        "text": "Describe a vulnerability you've mitigated."
      },
      {
        "id": "sec-3",
        "text": "How do you think about threat modeling?"
      },
      {
        "id": "sec-4",
        "text": "What is the difference between authentication and authorization?"
      },
      {
        "id": "sec-5",
        "text": "How would you prevent SQL injection?"
      },
      {
        "id": "sec-6",
        "text": "Explain the principle of least privilege."
      }
    ]
  }
};
