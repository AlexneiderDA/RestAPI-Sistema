-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'normal';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lasLoginAT" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "DashboardMetric" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "metricType" TEXT NOT NULL,
    "metricValue" JSONB NOT NULL,
    "dateKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DashboardMetric_userId_metricType_dateKey_idx" ON "DashboardMetric"("userId", "metricType", "dateKey");

-- CreateIndex
CREATE INDEX "DashboardMetric_metricType_dateKey_idx" ON "DashboardMetric"("metricType", "dateKey");

-- CreateIndex
CREATE INDEX "DashboardMetric_dateKey_idx" ON "DashboardMetric"("dateKey");

-- CreateIndex
CREATE UNIQUE INDEX "DashboardMetric_userId_metricType_dateKey_key" ON "DashboardMetric"("userId", "metricType", "dateKey");

-- CreateIndex
CREATE INDEX "Certificate_eventId_status_idx" ON "Certificate"("eventId", "status");

-- CreateIndex
CREATE INDEX "Certificate_issuedDate_idx" ON "Certificate"("issuedDate");

-- CreateIndex
CREATE INDEX "Certificate_userId_issuedDate_idx" ON "Certificate"("userId", "issuedDate");

-- CreateIndex
CREATE INDEX "Event_organizerId_isActive_startDate_idx" ON "Event"("organizerId", "isActive", "startDate");

-- CreateIndex
CREATE INDEX "Event_organizerId_isActive_endDate_idx" ON "Event"("organizerId", "isActive", "endDate");

-- CreateIndex
CREATE INDEX "Event_organizerId_createdAt_idx" ON "Event"("organizerId", "createdAt");

-- CreateIndex
CREATE INDEX "EventRegistration_eventId_status_idx" ON "EventRegistration"("eventId", "status");

-- CreateIndex
CREATE INDEX "EventRegistration_registrationDate_status_idx" ON "EventRegistration"("registrationDate", "status");

-- CreateIndex
CREATE INDEX "EventRegistration_attendanceCheckedIn_idx" ON "EventRegistration"("attendanceCheckedIn");

-- CreateIndex
CREATE INDEX "EventRegistration_userId_registrationDate_idx" ON "EventRegistration"("userId", "registrationDate");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_type_createdAt_idx" ON "Notification"("userId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_priority_createdAt_idx" ON "Notification"("priority", "createdAt");

-- CreateIndex
CREATE INDEX "User_rolId_createdAt_idx" ON "User"("rolId", "createdAt");

-- CreateIndex
CREATE INDEX "UserActivity_userId_activityType_createdAt_idx" ON "UserActivity"("userId", "activityType", "createdAt");

-- CreateIndex
CREATE INDEX "UserActivity_activityType_createdAt_idx" ON "UserActivity"("activityType", "createdAt");

-- CreateIndex
CREATE INDEX "UserActivity_relatedEntityType_relatedEntityId_createdAt_idx" ON "UserActivity"("relatedEntityType", "relatedEntityId", "createdAt");

-- AddForeignKey
ALTER TABLE "DashboardMetric" ADD CONSTRAINT "DashboardMetric_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
