import { storage } from './src/services/storage';
import { centralGovernance } from './src/services/centralGovernanceEngine';

function runRegressionTest() {
  console.log("Starting Regression Test for OCR Paste Integration...");
  
  // Storage init shouldn't be affected
  try {
     const init = storage.getSettings();
     console.log("Phase 1: Storage Access -> PASS");
  } catch(e) {
     console.log("Phase 1: Storage Access -> FAIL");
  }

  // Governance engine shouldn't be affected
  try {
     const result = centralGovernance.runDirectionalIntegrityTests();
     console.log("Phase 2: Governance Tests Executable -> PASS");
  } catch(e) {
     console.log("Phase 2: Governance Tests Executable -> FAIL");
  }
}

runRegressionTest();
