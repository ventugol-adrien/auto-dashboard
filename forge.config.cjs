const { MakerDeb } = require('@electron-forge/maker-deb');

module.exports = {
    packagerConfig: {
        asar: true,
    },
    makers: [new MakerDeb()],
};
