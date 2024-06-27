export async function jsonParse(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => (body += chunk.toString()));
        req.on('end', () => {
            try {
                if (body.trim() === '') {
                    throw new Error('Invalid input');
                }
                const data = JSON.parse(body);
                return resolve(data);
            }
            catch (error) {
                return reject(error);
            }
        });
    });
}
