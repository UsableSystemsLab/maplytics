export const uploadPublicFile = (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'No file uploaded'
        });
    }

    res.status(201).json({
        success: true,
        message: 'Public dataset uploaded successfully',
        type: 'public',
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        path: `/datasets/public/${req.file.filename}`,
        url: `/files/public/${req.file.filename}`,
    });
};

export const uploadPrivateFile = (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'No file uploaded'
        });
    }

    res.status(201).json({
        success: true,
        message: 'Private dataset uploaded successfully',
        type: 'private',
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        path: `/datasets/private/${req.file.filename}`,
        url: `/files/private/${req.file.filename}`,
    });
};