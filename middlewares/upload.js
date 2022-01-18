const multer = require('multer');

const storage = multer.diskStorage({
    destination: (req, File, cb) => {
        cb(null, 'public/images')
    },
    filename: (req,file, cb) =>{
        cb(null, '' + new Date().getTime() + '.' + file.mimetype.split('/')[1]);
    }
});

module.exports = multer({ storage });