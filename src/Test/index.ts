export function Init(message: string): void {
	console.info(
		`\n${Bun.color("yellow", "ansi")}INIT> ${Bun.color("white", "ansi")}${message}`
	);
}

export function Ok(message: string): void {
	console.info(
		`\n✅ ${Bun.color("green", "ansi")}OK> ${Bun.color("white", "ansi")}${message}`
	);
}

export function Error(message: string, error?: Error): void {
	console.info(
		`\n📛 ${Bun.color("red", "ansi")}>  ${Bun.color("white", "ansi")} ${message}`,
		error ? `\n${Bun.color("red", "ansi")}${error.stack}` : ''
	);
}

export function Request(method: string, url: string): void {
	console.info(`${Bun.color("magenta", "ansi")} + Request> ${Bun.color("white", "ansi")} ${method.toUpperCase()} ${url}`);
}

export function Finish(): void {
	console.info(
		`\n😃${Bun.color("green", "ansi")} > All tests completed `
	);
}
