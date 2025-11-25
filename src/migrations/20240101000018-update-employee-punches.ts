import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    // Add new columns to employee_punches table
    await queryInterface.addColumn('employee_punches', 'punchInPhoto', {
      type: DataTypes.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('employee_punches', 'punchOutPhoto', {
      type: DataTypes.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('employee_punches', 'punchInFingerprint', {
      type: DataTypes.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn('employee_punches', 'punchOutFingerprint', {
      type: DataTypes.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn('employee_punches', 'punchInLocation', {
      type: DataTypes.JSON,
      allowNull: true,
    });

    await queryInterface.addColumn('employee_punches', 'punchOutLocation', {
      type: DataTypes.JSON,
      allowNull: true,
    });

    await queryInterface.addColumn('employee_punches', 'effectiveWorkingHours', {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.removeColumn('employee_punches', 'punchInPhoto');
    await queryInterface.removeColumn('employee_punches', 'punchOutPhoto');
    await queryInterface.removeColumn('employee_punches', 'punchInFingerprint');
    await queryInterface.removeColumn('employee_punches', 'punchOutFingerprint');
    await queryInterface.removeColumn('employee_punches', 'punchInLocation');
    await queryInterface.removeColumn('employee_punches', 'punchOutLocation');
    await queryInterface.removeColumn('employee_punches', 'effectiveWorkingHours');
  },
};




