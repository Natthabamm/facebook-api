const { Op } = require('sequelize');
const { Friend, User } = require('../models');

exports.getAllFriends = async (req, res, next) => {
    try {
        const { status, searchName } = req.query;
        const where = { status };

        if (status) where.status = status;
        //  WHERE (`requestToId` = req.user.id OR `requestFromId` = req.user.id AND `status` = 'ACCEPTED)
        const friends = await Friend.FindAll({
            where: { 
                ...where, 
                [Or.or]: [{ requestToid: req.user.id }, { requestFromId: req.user.id }]
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
        const users = await User.FindAll({ 
            where: { 
                id: friendIds,
                ...userWhere, 
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
            },
            attributes: {
                exclude: ['password']
            }
        });
        res.status(20).json({ users });
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
}