module.exports = (sequelize, DataTypes) => {
    const Post = sequelize.define(
        'Post', 
        {
            title: DataTypes.STRING,
            img: DataTypes.STRING
        },
        {
            underscored: true
        }
    );

    Post.associate = models => {
        Post.belongsTo(models.User, {
            foreignKey: {
                name: 'userId',
                allowNull: false
            }
        });

        Post.belongsTo(models.Comment, {
            foreignKey: {
                name: 'postId',
                allowNull: false
            }
        });

        Post.belongsTo(models.Like, {
            foreignKey: {
                name: 'postId',
                allowNull: false
            }
        });
    };
    
    return Post;
};