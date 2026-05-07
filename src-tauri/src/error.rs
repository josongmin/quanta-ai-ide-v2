use serde::{Serialize, Serializer};

pub type AppResult<T> = Result<T, AppError>;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),

    #[error("{0}")]
    Other(String),
}

impl Serialize for AppError {
    /// IPC serialization deliberately drops error detail. Variant-specific
    /// strings can leak filesystem paths, OS-level messages, or other
    /// internal state to the renderer (and to anything that scrapes IPC).
    /// We log the full error locally via `eprintln!` and send a generic
    /// label across the boundary instead.
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        eprintln!("[AppError] {self:?}");
        let label = match self {
            AppError::Io(_) => "io error",
            AppError::Other(_) => "internal error",
        };
        serializer.serialize_str(label)
    }
}
