import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.createTable('permissions', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    module: {
      type: DataTypes.ENUM(
        'batches',
        'students',
        'faculty',
        'employees',
        'sessions',
        'attendance',
        'payments',
        'portfolios',
        'reports',
        'approvals',
        'users',
        'software_completions',
        'student_leaves',
        'batch_extensions'
      ),
      allowNull: false,
    },
    canView: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    canAdd: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    canEdit: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    canDelete: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await queryInterface.addIndex('permissions', ['userId', 'module'], {
    unique: true,
    name: 'unique_user_module',
  });
};

export const down = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.dropTable('permissions');
};




