import { auditLogger } from '../src/services/auditLogger';

async function testAuditLog() {
    console.log('Testing Audit Logger...');
    try {
        await auditLogger.log({
            action: 'test_action',
            resourceType: 'test_resource',
            details: { message: 'This is a test log' }
        });
        console.log('Audit log entry created successfully.');
    } catch (err) {
        console.error('Failed to create audit log:', err);
        process.exit(1);
    }
}

testAuditLog();
