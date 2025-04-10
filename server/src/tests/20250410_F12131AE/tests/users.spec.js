const { request, baseURL, Users, HTTP_STATUS_CODES } = require("../../common");

const users = [
  {
    email: "example.one@email.com",
    password: "aA1.fvWedBh@edf",
  },
  {
    email: "example.two@email.com",
    password: "aA1.fvWedBh@edf",
  },
  {
    email: "example.three@email.com",
    password: "aA1.fvWedBh@edf",
  },
  {
    email: "example.four@email.com",
    password: "aA1.fvWedBh@edf",
  },
  {
    email: "example.five@email.com",
    password: "aA1.fvWedBh@edf",
  },
];
let agent;
let server;

beforeAll(async () => {
  const common = require("../../common");
  server = common.server;
  agent = request.agent(server);
});

afterAll((done) => {
  server.close(done);
});

describe("/auth", () => {
  beforeEach(async () => {
    await Users.deleteAllUsers();
  });

  describe("POST /auth/signup", () => {
    test("should throw error because of wrong email, email in use", async () => {
      const res = await agent.post(`${baseURL}/auth/signup`).send(users[0]);

      expect(res.status).toBe(HTTP_STATUS_CODES.CREATED);
      expect(res.body.status).toBe("completed");
      expect(res.body.message).toBe("User signed up successfully.");
      expect(res.body.data).toHaveProperty("accessToken");
      expect(res.body.data).toHaveProperty("refreshToken");

      const signupWrongEmailRes = await agent
        .post(`${baseURL}/auth/signup`)
        .send(users[0]);

      expect(signupWrongEmailRes.status).toBe(HTTP_STATUS_CODES.CONFLICT);
      expect(signupWrongEmailRes.body.status).toBe("error");
      expect(signupWrongEmailRes.body.message).toBe("Email is in use");
      expect(signupWrongEmailRes.body.data).toBe(null);
    });
    test("should throw error because of invalid email and password", async () => {
      const signupWrongEmailRes = await agent
        .post(`${baseURL}/auth/signup`)
        .send({ email: "email", password: 12345678 });

      expect(signupWrongEmailRes.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
      expect(signupWrongEmailRes.body.status).toBe("error");
      // expect(signupWrongEmailRes.body.message).toBe("Internal server error");
      expect(signupWrongEmailRes.body.data).toBe(null);
    });
    test("should return new user when all request body is valid to signup", async () => {
      const res = await agent.post(`${baseURL}/auth/signup`).send(users[0]);

      expect(res.status).toBe(HTTP_STATUS_CODES.CREATED);
      expect(res.body.status).toBe("completed");
      expect(res.body.message).toBe("User signed up successfully.");
      expect(res.body.data).toHaveProperty("accessToken");
      expect(res.body.data).toHaveProperty("refreshToken");
    });
  });

  describe("POST /auth/login", () => {
    test("should throw error because of wrong email", async () => {
      const res = await agent.post(`${baseURL}/auth/signup`).send(users[0]);

      expect(res.status).toBe(HTTP_STATUS_CODES.CREATED);
      expect(res.body.status).toBe("completed");
      expect(res.body.message).toBe("User signed up successfully.");
      expect(res.body.data).toHaveProperty("accessToken");
      expect(res.body.data).toHaveProperty("refreshToken");

      const loginWrongUsernameRes = await agent
        .post(`${baseURL}/auth/login`)
        .send({
          email: "test@email.com",
          password: users[0].password,
        });

      expect(loginWrongUsernameRes.status).toBe(HTTP_STATUS_CODES.UNAUTHORIZED);
      expect(loginWrongUsernameRes.body.status).toBe("error");
      expect(loginWrongUsernameRes.body.message).toBe(
        "Incorrect email or password"
      );
      expect(loginWrongUsernameRes.body.data).toBe(null);
    });
    test("should throw an error because of invalid password", async () => {
      const res = await agent.post(`${baseURL}/auth/signup`).send(users[0]);

      expect(res.status).toBe(HTTP_STATUS_CODES.CREATED);
      expect(res.body.status).toBe("completed");
      expect(res.body.message).toBe("User signed up successfully.");
      expect(res.body.data).toHaveProperty("accessToken");
      expect(res.body.data).toHaveProperty("refreshToken");

      const loginWrongUsernameRes = await agent
        .post(`${baseURL}/auth/login`)
        .send({
          email: users[0].email,
          password: "12345678",
        });

      expect(loginWrongUsernameRes.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
      expect(loginWrongUsernameRes.body.status).toBe("error");
      // expect(loginWrongUsernameRes.body.message).toBe("Internal server error");
      expect(loginWrongUsernameRes.body.data).toBe(null);
    });
    test("should throw an error because of wrong password", async () => {
      const res = await agent.post(`${baseURL}/auth/signup`).send(users[0]);

      expect(res.status).toBe(HTTP_STATUS_CODES.CREATED);
      expect(res.body.status).toBe("completed");
      expect(res.body.message).toBe("User signed up successfully.");
      expect(res.body.data).toHaveProperty("accessToken");
      expect(res.body.data).toHaveProperty("refreshToken");

      const loginWrongUsernameRes = await agent
        .post(`${baseURL}/auth/login`)
        .send({
          email: users[0].email,
          password: "aSd,@d4kwdsx,,",
        });

      expect(loginWrongUsernameRes.status).toBe(HTTP_STATUS_CODES.UNAUTHORIZED);
      expect(loginWrongUsernameRes.body.status).toBe("error");
      expect(loginWrongUsernameRes.body.message).toBe(
        "Incorrect email or password"
      );
      expect(loginWrongUsernameRes.body.data).toBe(null);
    });
    test("should return tokens after login in", async () => {
      const res = await agent.post(`${baseURL}/auth/signup`).send(users[0]);

      expect(res.status).toBe(HTTP_STATUS_CODES.CREATED);
      expect(res.body.status).toBe("completed");
      expect(res.body.message).toBe("User signed up successfully.");
      expect(res.body.data).toHaveProperty("accessToken");
      expect(res.body.data).toHaveProperty("refreshToken");

      const loginRes = await agent.post(`${baseURL}/auth/login`).send(users[0]);

      expect(loginRes.status).toBe(HTTP_STATUS_CODES.OK);
      expect(loginRes.body.status).toBe("completed");
      expect(loginRes.body.message).toBe("User logged in successfully.");
      expect(loginRes.body.data).toHaveProperty("accessToken");
      expect(loginRes.body.data).toHaveProperty("refreshToken");
    });
  });

  afterAll(() => {
    return Users.deleteAllUsers();
  });
});
