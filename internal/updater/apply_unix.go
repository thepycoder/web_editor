//go:build !windows

package updater

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

// scheduleReplaceAndRestart writes a shell script, starts it detached.
func scheduleReplaceAndRestart(oldPID int, newExePath, finalExePath string) error {
	newExePath, err := filepath.Abs(newExePath)
	if err != nil {
		return err
	}
	finalExePath, err = filepath.Abs(finalExePath)
	if err != nil {
		return err
	}

	script := fmt.Sprintf(`#!/bin/sh
NEW=%q
FINAL=%q
PID=%d
while kill -0 "$PID" 2>/dev/null; do sleep 1; done
rm -f "$FINAL"
mv -f "$NEW" "$FINAL"
chmod +x "$FINAL"
nohup "$FINAL" >/dev/null 2>&1 &
rm -f "$0"
`, newExePath, finalExePath, oldPID)

	dir := filepath.Dir(finalExePath)
	tmp, err := os.CreateTemp(dir, "projectwhy-update-*.sh")
	if err != nil {
		tmp, err = os.CreateTemp("", "projectwhy-update-*.sh")
		if err != nil {
			return err
		}
	}
	shPath := tmp.Name()
	if _, err := tmp.WriteString(script); err != nil {
		tmp.Close()
		_ = os.Remove(shPath)
		return err
	}
	if err := tmp.Close(); err != nil {
		_ = os.Remove(shPath)
		return err
	}
	if err := os.Chmod(shPath, 0o700); err != nil {
		_ = os.Remove(shPath)
		return err
	}

	cmd := exec.Command("/bin/sh", shPath)
	cmd.Stdout = nil
	cmd.Stdin = nil
	cmd.Stderr = nil
	if err := cmd.Start(); err != nil {
		_ = os.Remove(shPath)
		return fmt.Errorf("start update script: %w", err)
	}
	_ = cmd.Process.Release()
	return nil
}
