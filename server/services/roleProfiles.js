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
      }
    ]
  }
};
