import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.addColumn('payment_transactions', 'paidAmount', {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.sequelize.query(
      "ALTER TABLE `payment_transactions` MODIFY `status` ENUM('pending','partial','paid') NOT NULL DEFAULT 'pending';"
    );
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.removeColumn('payment_transactions', 'paidAmount');

    await queryInterface.sequelize.query(
      "ALTER TABLE `payment_transactions` MODIFY `status` ENUM('pending','paid') NOT NULL DEFAULT 'pending';"
    );
  },
};




