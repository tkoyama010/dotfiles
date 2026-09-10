-- Colorscheme
vim.cmd("colorscheme edge")

-- Global variables
vim.g.Coopilot = "enable"
vim.g.DiffUnit = "Char"
vim.g.copilot_filetypes = { gitcommit = true }

-- Options
vim.opt.background = "light"
vim.opt.cursorcolumn = true
vim.opt.cursorline = true
vim.opt.fileencodings = "iso-2022-jp,cp932,sjis,euc-jp,utf-8"
vim.opt.helplang = "ja"
vim.opt.hlsearch = true
vim.opt.number = true
vim.opt.wrap = true

-- Syntax
vim.cmd("syntax on")
