const dataForSeoConfig = {
  enabled: process.env.DATAFORSEO_ENABLED === "true",

  credentials: {
    login: process.env.DATAFORSEO_LOGIN || "",
    password: process.env.DATAFORSEO_PASSWORD || ""
  },

  endpoints: {
    baseUrl: "https://api.dataforseo.com/v3",
    serpTaskPost: "/serp/google/organic/task_post",
    serpTaskGet: "/serp/google/organic/task_get/regular"
  }
};

module.exports = dataForSeoConfig;
