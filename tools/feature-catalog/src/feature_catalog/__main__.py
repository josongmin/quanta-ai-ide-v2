"""Allow `python -m feature_catalog ...` as an alias for `fcat ...`.

Wire `python -m feature_catalog validate` into CI from package.json
without depending on the `fcat` console-script being on PATH.
"""

from feature_catalog.cli import main

if __name__ == "__main__":
    main()
