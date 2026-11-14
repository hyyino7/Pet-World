"""The production service entry with test-owned P2 failure injection."""
import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src/memory"))
from memory_faults import install_file_faults
install_file_faults(os.environ["CHATPET_MEMORY_FAULT_FILE"])
from main import main
main()
