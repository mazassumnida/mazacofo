-- CreateTable
CREATE TABLE `clients` (
    `idx` INTEGER NOT NULL AUTO_INCREMENT,
    `handle` VARCHAR(191) NOT NULL,
    `rank` VARCHAR(25) NULL,
    `rating` INTEGER NULL,
    `maxRank` VARCHAR(25) NULL,
    `topRating` INTEGER NULL,

    UNIQUE INDEX `clients_handle_key`(`handle`),
    PRIMARY KEY (`idx`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
