import "server-only";

import { ensureBackupSchedulerStarted } from "@/app/lib/backup";

ensureBackupSchedulerStarted();
