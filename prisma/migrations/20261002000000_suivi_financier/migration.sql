-- AlterEnum
ALTER TYPE "TypeDocument" ADD VALUE 'AVENANT';
ALTER TYPE "TypeDocument" ADD VALUE 'CERTIFICAT_PAIEMENT';

-- AlterTable
ALTER TABLE "Lot" ADD COLUMN "dernierNumeroAvenant" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "cautionBancaire" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Parametres" ADD COLUMN "rcs" TEXT NOT NULL DEFAULT '328999503',
ADD COLUMN "ape" TEXT NOT NULL DEFAULT '4120A',
ADD COLUMN "tvaIntracommunautaire" TEXT NOT NULL DEFAULT 'FR47328999503';

-- L'adresse du certificat SOCOREVE : seule l'ancienne valeur par défaut est remplacée, une adresse saisie reste.
UPDATE "Parametres" SET "email" = 'contact@socoreve-chateaubriant.com' WHERE "email" = 'contact@socoreve-chateaubriant.fr';

-- CreateTable
CREATE TABLE "Avenant" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "devis" TEXT NOT NULL DEFAULT '',
    "montantHt" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "date" DATE NOT NULL,
    "objet" TEXT NOT NULL DEFAULT '',
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Avenant_pkey" PRIMARY KEY ("id"),
    -- Écrites à la main : Prisma ne connaît pas les CHECK.
    CONSTRAINT "Avenant_numero_positif" CHECK ("numero" >= 1)
);

-- CreateTable
CREATE TABLE "Acompte" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "montantHt" DECIMAL(18,2) NOT NULL,
    "manuel" BOOLEAN NOT NULL DEFAULT false,
    "cumulRealiseHt" DECIMAL(18,2),
    "mois" TEXT,
    "date" DATE,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Acompte_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Acompte_numero_positif" CHECK ("numero" >= 1),
    CONSTRAINT "Acompte_montant_positif" CHECK ("montantHt" > 0),
    CONSTRAINT "Acompte_certificat_complet" CHECK ("manuel" OR ("cumulRealiseHt" IS NOT NULL AND "mois" IS NOT NULL AND "date" IS NOT NULL)),
    -- Même expression que MOIS_VALIDE (src/domaine/certificats.ts).
    CONSTRAINT "Acompte_mois_valide" CHECK ("mois" IS NULL OR "mois" ~ '^(20[0-9]{2})-(0[1-9]|1[0-2])$')
);

-- CreateIndex
CREATE UNIQUE INDEX "Avenant_lotId_numero_key" ON "Avenant"("lotId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "Acompte_lotId_numero_key" ON "Acompte"("lotId", "numero");

-- AddForeignKey
ALTER TABLE "Avenant" ADD CONSTRAINT "Avenant_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Acompte" ADD CONSTRAINT "Acompte_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
