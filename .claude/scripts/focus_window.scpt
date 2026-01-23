on run argv
    if (count of argv) is 0 then
        tell application "Visual Studio Code" to activate
        return
    end if

    set targetText to item 1 of argv

    tell application "Visual Studio Code" to activate
    tell application "System Events"
        tell process "Code"
            repeat with w in windows
                try
                    if (name of w) contains targetText then
                        perform action "AXRaise" of w
                        set frontmost to true
                        exit repeat
                    end if
                end try
            end repeat
        end tell
    end tell
end run
