const { Op } = require('sequelize');
const { Friend, User } = require('../models');

exports.getUnknownn = async (req, res, next) => {
    try {
        const friends = await Friend.findAll({
            where: { 
                [Op.or]: [{ requestToid: req.user.id }, { requestFromId: req.user.id }]
            }
        });

        const friendIds = friends.reduce((acc, item) => {
            if (req.user.id === item.requestFromId) {
                acc.push(item.requestToId);
            } else {
                acc.push(item.requestFromId);
            }
            return acc;
        }, []);

        const users = await User.findAll({ where: { 
            id: {
                [Op.notIn]: friendIds
            } } })
        res.status(200).json({ users });
    } catch (err) {
        next(err);
    }
}

exports.getAllFriends = async (req, res, next) => {
    try {
        const { status, searchName } = req.query;
        const where = {[Op.or]: [{ requestToid: req.user.id }, { requestFromId: req.user.id }]};
        if (status === 'ACCEPTED') {
            where = {
                status,
                [Op.or]: [{ requestToid: req.user.id }, { requestFromId: req.user.id }]
            }
        } else if (status === 'REQUESTED') {
            where = {
                status,
                requestToId: req.user.id
            }
        }

        if (status) where.status = status;
        //  WHERE (`requestToId` = req.user.id OR `requestFromId` = req.user.id AND `status` = 'ACCEPTED)
        const friends = await Friend.findAll({ where });

        const friendIds = friends.reduce((acc, item) => {
            if (req.user.id === item.requestFromId) {
                acc.push(item.requestToId);
            } else {
                acc.push(item.requestFromId);
            }
            return acc;
        }, []);

        let userWhere = {};
        if (searchName) {
            userWhere = {
                [Op.or] : [
                    {firstName: {
                            [Op.substring]: searchName
                        }
                    },
                    {lastName: {
                            [Op.substring]: searchName
                        }
                    }
                ]
            };
        }

        // SELECT * FROM user WHERE id IN (friends) AND (firstName LIKE '%userWhere% OR lastName Loke '%userWhere%')
        const users = await User.findAll({ 
            where: { 
                id: friendIds,
                ...userWhere, 
                
            },
            attributes: {
                exclude: ['password']
            }
        });
        res.status(200).json({ users });
    } catch (err) {
        next(err)
    }
};

exports.requestFriend = async (req, res, next) => {
    try {
        const { requestToId } = req.body;
        
        if (req.user.id === requestToId) {
            return res.status(400).json({ message: 'cannot request yourself' })
        }
        //  WHERE `requestFromId` = req.user.id AND `requestToId` = requestToId OR (`requestFromId` = requestToId AND `requestToid` = req.user.id)
        const existFriend = await Friend.findOne({ 
            where: {
                [Op.or]: [
                    { 
                        requestFromId: req.user.id,
                        requestToId 
                    },
                    {
                        requestFromId: requestToId,
                        requestToId: req.user.id
                    } 
                ]
            } 
        });

        if (existFriend) {
            return res
                .status(400)
                .json(({ message: 'this friend has already been requested' }));
        }

        await Friend.create({ 
            requestToId,
            status: 'REQUESTED',
            requestFromId: req.user.id
        });
        res.status(200).json({ message: 'request has been sent' });
    } catch (err ){
        next(err)
    }
}

exports.updateFriend = async (req, res, next) => {
    try {
        const { friendId } = req.params;
        const friend = await Friend.findOne({ 
            where: { id: friendId, status: 'REQUESTED' } 
        });
        if (!friend) {
            return res.status(400).json({ message: 'this friend request not found' });
        }

        if (friend.requestToId !== req.user.id) {
            return res
                .status(403)
                .json({ message: 'cannot accept this friend request' })
        }

        await Friend.update({ status: 'ACCEPTED' }, { where: { id:  friendId } });
        res.status(200).json({ message: 'friend request accepted' });
    } catch (err) {
        next(err)
    }
};

exports.deleteFriend = async (req, res, next) => {
    try {
        const { friendId } = req.params;
        const friend = await Friend.findOne({ 
            where: { 
                [Op.or]: [
                    { requestToid: req.user.id, requestFromId: req.user.id }, 
                    { requestToId: friendId, requestFromId: req.user.id }
                ]
            } 
        });

        if (!friend) {
            return res.status(400).json({ message: 'this friend requrest not found' });
        }

        if (
            friend.requestFromId !== req.user.id &&
            friend.requestToId !== req.user.id
            ) {
            return res
                .status(403)
                .json({ message: 'cannot delete this friend request' })
        }

        await Friend.destroy({ where: { id: friendId } });
        res.status(204).json();
    } catch (err) {
        next(err)
    }
}

// TEST 
// exports.getTest = async (req, res, next) => {
//     try {
//         const result = await Friend.findOne({ where: { id: 6 } });
//         console.log(result)
//         res.status(200).json({ result });
//     } catch (err) {
//        next(err) 
//     }
// }
