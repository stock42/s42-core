import pc from 'picocolors';
export const Init = (str) => {
    console.info(' ');
    console.info(pc.bgYellow(pc.white(`> ${str}`)));
};
export const Ok = (str) => {
    console.info(' ');
    console.info('✅', pc.bgGreen(pc.white(`> ${str}`)));
};
export const Error = (str, err) => {
    console.info(' ');
    console.info('📛', pc.bgRed(pc.white(`${str}`)), err);
};
export const Request = (method, url) => {
    console.info(pc.bgMagenta(pc.white(`+ Request > ${method} ${url}`)));
};
export const Finish = () => {
    console.info('😃', pc.bgWhite(pc.red('All tests completed')));
};
