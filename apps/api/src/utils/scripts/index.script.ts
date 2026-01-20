import { program } from "commander";
import { createHandler } from "./handler.script.ts";
import { createMiddleware } from "./middleware.script.ts";
import { createModel } from "./model.script.ts";
import { createService } from "./service.script.ts";

program
	.name("create-file")
	.description("CLI to create some files to work on project")
	.version("0.1.0");

program
	.command("model")
	.description("Create model file to work on project")
	.argument("<modelname>", "Specify the model name")
	.action(createModel);

program
	.command("handler")
	.description("Create router handler files to work on project")
	.argument("<handlername>", "Specify the handler name")
	.option(
		"-d, --dir <dir>",
		"Specify the directory in handler you want to create your new handler into.",
	)
	.action(createHandler);

program
	.command("middleware")
	.description("Create middleware file to work on project")
	.argument("<middlewarename>", "Specify the middleware name")
	.action(createMiddleware);

program
	.command("service")
	.description("Create service files to work on project")
	.argument("<servicename>", "Specify the service name")
	.option(
		"-d, --dir <dir>",
		"Specify the directory in service you want to create your new service into.",
	)
	.action(createService);

program.parse();
