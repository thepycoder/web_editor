package updater

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// scheduleReplace writes a batch script, starts it detached, returns immediately.
// After the process oldPID exits, the script replaces newExePath with finalExePath.
// If restartAfter is true, it also starts finalExePath.
func scheduleReplace(oldPID int, newExePath, finalExePath string, restartAfter bool) error {
	newExePath, err := filepath.Abs(newExePath)
	if err != nil {
		return err
	}
	finalExePath, err = filepath.Abs(finalExePath)
	if err != nil {
		return err
	}

	newQ := escapeBatchSET(newExePath)
	finalQ := escapeBatchSET(finalExePath)

	script := fmt.Sprintf(`@echo off
setlocal
set "NEWEXE=%s"
set "FINAL=%s"
set OPID=%d

:wait
tasklist /FI "PID eq %%OPID%%" 2>NUL | find /I "%%OPID%%" >NUL
if errorlevel 1 goto replace
timeout /t 1 /nobreak >nul
goto wait

:replace
if exist "%%FINAL%%" del /F /Q "%%FINAL%%"
move /Y "%%NEWEXE%%" "%%FINAL%%"
`, newQ, finalQ, oldPID)
	if restartAfter {
		script += fmt.Sprintf("start \"\" \"%%FINAL%%\"\n")
	}
	script += `del "%~f0"
`

	dir := filepath.Dir(finalExePath)
	tmp, err := os.CreateTemp(dir, "projectwhy-update-*.bat")
	if err != nil {
		tmp, err = os.CreateTemp("", "projectwhy-update-*.bat")
		if err != nil {
			return err
		}
	}
	batPath := tmp.Name()
	if _, err := tmp.WriteString(script); err != nil {
		tmp.Close()
		_ = os.Remove(batPath)
		return err
	}
	if err := tmp.Close(); err != nil {
		_ = os.Remove(batPath)
		return err
	}

	cmd := exec.Command("cmd.exe", "/C", batPath)
	cmd.Stdout = nil
	cmd.Stdin = nil
	cmd.Stderr = nil
	if err := cmd.Start(); err != nil {
		_ = os.Remove(batPath)
		return fmt.Errorf("start update script: %w", err)
	}
	_ = cmd.Process.Release()
	// Best-effort cleanup if script fails before self-delete
	time.AfterFunc(10*time.Minute, func() { _ = os.Remove(batPath) })
	return nil
}

func escapeBatchSET(s string) string {
	return strings.ReplaceAll(s, "%", "%%")
}
