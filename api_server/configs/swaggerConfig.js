import swaggerJSDoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.1",
    info: {
      title: "Maplytics API",
      version: "1.0.0",
      description: "This is the API for the Maplytics project",
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    servers: [
      {
        url: "http://localhost:4000/api",
      },
    ],
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./routes/*.js", "./controllers/*.js", "./models/*.js"],
};

const specs = swaggerJSDoc(options);
// export the docs into json
// import fs from 'fs';
// fs.writeFileSync('./docs/maplytics-api-docs.json', JSON.stringify(specs, null, 2));
export default specs;
